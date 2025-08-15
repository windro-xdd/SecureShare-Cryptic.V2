/**
 * SecureShare v2.0 - Client-Side E2E Encryption Logic
 * Implements the sender and receiver cryptographic flows.
 * Uses Web Crypto API for all operations.
 */

// --- Configuration ---
const KDF_ITERATIONS = 250000; // Number of iterations for PBKDF2
const KDF_HASH = "SHA-256";
const SALT_BYTES = 16; // 128 bits
const IV_BYTES = 12; // 96 bits for AES-GCM
const KEY_ALG = "AES-GCM";
const KEY_LEN = 256;
const WRAP_ALG = "AES-GCM"; // Algorithm to wrap the file key
const WRAP_IV_BYTES = 12;

// --- Base32 Encoding for Human-Readable Codes ---
const BASE32_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes I, O, 0, 1

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let bitLength = 0;
  let result = "";

  for (let i = 0; i < bytes.length; i++) {
    bits = (bits << 8) | bytes[i];
    bitLength += 8;
    while (bitLength >= 5) {
      result += BASE32_CHARS[(bits >>> (bitLength - 5)) & 31];
      bitLength -= 5;
    }
  }

  if (bitLength > 0) {
    result += BASE32_CHARS[(bits << (5 - bitLength)) & 31];
  }

  return result;
}

// --- Helper Functions ---
const arrayBufferToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

const hexToArrayBuffer = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

// --- Core Cryptographic Functions ---

/**
 * Generates a human-friendly, secure download code.
 * @param {number} length - The desired length of the code.
 * @returns {string} The generated download code.
 */
export function generateDownloadCode(length = 10): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length * 5 / 8)));
  return encodeBase32(randomBytes).slice(0, length);
}

/**
 * Generates a new symmetric key for file encryption.
 * @returns {Promise<CryptoKey>} The generated file key.
 */
export async function generateFileKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: KEY_ALG, length: KEY_LEN },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derives a Key Encryption Key (KEK) from the download code and salt.
 * @param {string} downloadCode - The user-provided download code.
 * @param {Uint8Array} salt - The salt used for key derivation.
 * @returns {Promise<CryptoKey>} The derived KEK.
 */
async function deriveKek(downloadCode: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(downloadCode),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer,
      iterations: KDF_ITERATIONS,
      hash: KDF_HASH,
    },
    baseKey,
    { name: WRAP_ALG, length: KEY_LEN },
    true,
    ["wrapKey", "unwrapKey"]
  );
}

/**
 * Encrypts the file key (key wrapping).
 * @param {CryptoKey} fileKey - The key to wrap.
 * @param {CryptoKey} kek - The Key Encryption Key.
 * @returns {Promise<{wrappedKey: ArrayBuffer, iv: Uint8Array}>} The wrapped key and the IV used.
 */
async function wrapFileKey(fileKey: CryptoKey, kek: CryptoKey): Promise<{ wrappedKey: ArrayBuffer, iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(WRAP_IV_BYTES));
  const wrappedKey = await crypto.subtle.wrapKey(
    "raw",
    fileKey,
    kek,
    { name: WRAP_ALG, iv: iv.buffer }
  );
  return { wrappedKey, iv };
}

/**
 * Decrypts the file key (key unwrapping).
 * @param {Uint8Array} wrappedKey - The encrypted file key.
 * @param {Uint8Array} iv - The IV used for wrapping.
 * @param {CryptoKey} kek - The Key Encryption Key.
 * @returns {Promise<CryptoKey>} The unwrapped file key.
 */
async function unwrapFileKey(wrappedKey: Uint8Array, iv: Uint8Array, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    wrappedKey.buffer,
    kek,
    { name: WRAP_ALG, iv: iv.buffer },
    { name: KEY_ALG, length: KEY_LEN },
    true,
    ["encrypt", "decrypt"]
  );
}

// --- Sender Flow ---

/**
 * Encrypts a file and prepares the metadata envelope for upload.
 * @param {File} file - The file to encrypt.
 * @param {string} downloadCode - The generated download code.
 * @returns {Promise<{ciphertext: ArrayBuffer, envelope: object}>} The encrypted data and public metadata.
 */
export async function encryptFile(file: File, downloadCode: string) {
  const fileKey = await generateFileKey();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const kek = await deriveKek(downloadCode, salt);
  
  const { wrappedKey } = await wrapFileKey(fileKey, kek);

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const fileBuffer = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: KEY_ALG, iv: iv.buffer },
    fileKey,
    fileBuffer
  );

  const envelope = {
    filename: file.name,
    mime_type: file.type,
    size: file.size,
    alg: KEY_ALG,
    iv: arrayBufferToHex(iv),
    salt: arrayBufferToHex(salt),
    kdf_params: {
      name: "PBKDF2",
      iterations: KDF_ITERATIONS,
      hash: KDF_HASH,
    },
    wrapped_file_key: arrayBufferToHex(new Uint8Array(wrappedKey)),
    // Note: expires_at and max_downloads are set server-side or in the upload component
  };

  return { ciphertext, envelope };
}

// --- Receiver Flow ---

/**
 * Decrypts a file using the metadata envelope and download code.
 * @param {ArrayBuffer} ciphertext - The encrypted file data.
 * @param {object} envelope - The public metadata from the server.
 * @param {string} downloadCode - The user-provided download code.
 * @returns {Promise<Blob>} The decrypted file as a Blob.
 */
export async function decryptFile(ciphertext: ArrayBuffer, envelope: any, downloadCode: string): Promise<Blob> {
  try {
    const salt = hexToArrayBuffer(envelope.salt);
    const kek = await deriveKek(downloadCode, salt);

    const wrappedKey = hexToArrayBuffer(envelope.wrapped_file_key);
    const wrapIv = hexToArrayBuffer(envelope.iv);

    const fileKey = await unwrapFileKey(wrappedKey, wrapIv, kek);

    const iv = hexToArrayBuffer(envelope.iv);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: KEY_ALG, iv: iv.buffer },
      fileKey,
      ciphertext
    );

    return new Blob([decryptedBuffer], { type: envelope.mime_type });
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Decryption failed. The download code may be incorrect or the data corrupted.");
  }
}
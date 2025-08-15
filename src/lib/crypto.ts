/**
 * SecureShare v2.0 - Client-Side E2E Encryption Logic
 * Implements the sender and receiver cryptographic flows.
 * Uses Web Crypto API for all operations.
 */

// --- Configuration ---
const KDF_ITERATIONS = 250000; // Number of iterations for PBKDF2
const KDF_HASH = "SHA-256"; // Corrected from SHA-26
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

const hexToArrayBuffer = (hex: string): Uint8Array => {
  const buffer = new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return view;
};

// --- Core Cryptographic Functions ---

export function generateDownloadCode(length = 10): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length * 5 / 8)));
  return encodeBase32(randomBytes).slice(0, length);
}

export async function generateFileKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: KEY_ALG, length: KEY_LEN },
    true,
    ["encrypt", "decrypt"]
  );
}

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
      salt: salt.slice(),
      iterations: KDF_ITERATIONS,
      hash: KDF_HASH,
    },
    baseKey,
    { name: WRAP_ALG, length: KEY_LEN },
    true,
    ["wrapKey", "unwrapKey"]
  );
}

async function wrapFileKey(fileKey: CryptoKey, kek: CryptoKey): Promise<{ wrappedKey: ArrayBuffer, iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(WRAP_IV_BYTES));
  const wrappedKey = await crypto.subtle.wrapKey(
    "raw",
    fileKey,
    kek,
    { name: WRAP_ALG, iv: iv }
  );
  return { wrappedKey, iv };
}

async function unwrapFileKey(wrappedKey: Uint8Array, iv: Uint8Array, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    wrappedKey.slice(),
    kek,
    { name: WRAP_ALG, iv: iv.slice() },
    { name: KEY_ALG, length: KEY_LEN },
    true,
    ["encrypt", "decrypt"]
  );
}

// --- Sender Flow ---
export async function encryptFile(file: File, downloadCode: string, instructions?: string) {
  const fileKey = await generateFileKey();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const kek = await deriveKek(downloadCode, salt);
  
  const { wrappedKey, iv: wrapIv } = await wrapFileKey(fileKey, kek);

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const fileBuffer = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: KEY_ALG, iv: iv },
    fileKey,
    fileBuffer
  );

  let encryptedInstructionsData = {};
  if (instructions && instructions.trim() !== "") {
    const instructions_iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const encrypted_instructions = await crypto.subtle.encrypt(
      { name: KEY_ALG, iv: instructions_iv },
      fileKey,
      new TextEncoder().encode(instructions)
    );
    encryptedInstructionsData = {
      encrypted_instructions: arrayBufferToHex(new Uint8Array(encrypted_instructions)),
      instructions_iv: arrayBufferToHex(instructions_iv),
    };
  }

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
    wrap_iv: arrayBufferToHex(wrapIv),
    ...encryptedInstructionsData,
  };

  return { ciphertext, envelope };
}

// --- Receiver Flow ---

export async function getFileKey(envelope: any, downloadCode: string): Promise<CryptoKey> {
    const salt = hexToArrayBuffer(envelope.salt);
    const kek = await deriveKek(downloadCode, salt);
    const wrappedKey = hexToArrayBuffer(envelope.wrapped_file_key);
    const wrapIv = hexToArrayBuffer(envelope.wrap_iv);
    try {
        return await unwrapFileKey(wrappedKey, wrapIv, kek);
    } catch (error) {
        console.error("Key unwrap failed:", error);
        throw new Error("Decryption failed. The download code may be incorrect.");
    }
}

export async function decryptFile(ciphertext: ArrayBuffer, envelope: any, fileKey: CryptoKey): Promise<Blob> {
  try {
    const iv = hexToArrayBuffer(envelope.iv);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: KEY_ALG, iv: iv.slice() },
      fileKey,
      ciphertext
    );
    return new Blob([decryptedBuffer], { type: envelope.mime_type });
  } catch (error) {
    console.error("File decryption failed:", error);
    throw new Error("File decryption failed. The data may be corrupted.");
  }
}

export async function decryptInstructions(envelope: any, fileKey: CryptoKey): Promise<string | null> {
    if (!envelope.encrypted_instructions || !envelope.instructions_iv) {
        return null;
    }
    try {
        const instructions_iv = hexToArrayBuffer(envelope.instructions_iv);
        const encrypted_instructions = hexToArrayBuffer(envelope.encrypted_instructions);
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: KEY_ALG, iv: instructions_iv.slice() },
            fileKey,
            encrypted_instructions.slice()
        );
        return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
        console.error("Instructions decryption failed:", error);
        return "Could not decrypt instructions.";
    }
}
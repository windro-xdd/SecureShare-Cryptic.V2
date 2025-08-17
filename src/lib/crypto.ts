/**
 * SecureShare v2.0 - Client-Side E2E Encryption Logic
 * Implements the sender and receiver cryptographic flows.
 * Uses the Web Crypto API for all operations, ensuring no external dependencies are needed for security.
 */

// --- Cryptographic Configuration ---

/** Number of iterations for the Password-Based Key Derivation Function 2 (PBKDF2).
 * A higher number increases the cost of brute-force attacks. */
const KDF_ITERATIONS = 250000;

/** The hash function to use within PBKDF2. SHA-256 is a secure standard. */
const KDF_HASH = "SHA-256";

/** The length of the salt in bytes. A salt adds randomness to the key derivation process. */
const SALT_BYTES = 16; // 128 bits

/** The length of the Initialization Vector (IV) in bytes for AES-GCM. 12 bytes is standard. */
const IV_BYTES = 12; // 96 bits

/** The primary encryption algorithm used for files and instructions. AES-GCM provides authenticated encryption. */
const KEY_ALG = "AES-GCM";

/** The bit length of the generated file keys. 256 bits is a strong standard. */
const KEY_LEN = 256;

/** The algorithm used to "wrap" (encrypt) the file key. */
const WRAP_ALG = "AES-GCM";

/** The length of the IV for the key wrapping operation. */
const WRAP_IV_BYTES = 12;

// --- Base32 Encoding for Human-Readable Codes ---
const BASE32_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes confusing characters like I, O, 0, 1

/**
 * Encodes a byte array into a human-readable Base32 string.
 * @param {Uint8Array} bytes The byte array to encode.
 * @returns {string} The Base32 encoded string.
 */
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

/**
 * Generates a cryptographically random, human-readable download code.
 * @param {number} [length=10] The desired length of the code.
 * @returns {string} The generated download code.
 */
export function generateDownloadCode(length = 10): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length * 5 / 8)));
  return encodeBase32(randomBytes).slice(0, length);
}

/**
 * Generates a new symmetric key for encrypting a file.
 * @returns {Promise<CryptoKey>} A new AES-GCM CryptoKey.
 */
export async function generateFileKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: KEY_ALG, length: KEY_LEN },
    true, // Key is extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Derives a Key Encrypting Key (KEK) from the user's download code and a salt.
 * This KEK is used to wrap the file key.
 * @param {string} downloadCode The user-facing secret code.
 * @param {Uint8Array} salt A random salt to add to the derivation.
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

/**
 * Encrypts (wraps) the file key using the KEK.
 * @param {CryptoKey} fileKey The key to be wrapped.
 * @param {CryptoKey} kek The Key Encrypting Key.
 * @returns {Promise<{ wrappedKey: ArrayBuffer, iv: Uint8Array }>} The wrapped key and its IV.
 */
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

/**
 * Decrypts (unwraps) the file key using the KEK.
 * @param {Uint8Array} wrappedKey The encrypted file key.
 * @param {Uint8Array} iv The IV used during wrapping.
 * @param {CryptoKey} kek The Key Encrypting Key.
 * @returns {Promise<CryptoKey>} The original file key.
 */
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

/**
 * The main encryption function for the sender.
 * It takes a file and a download code, and returns the encrypted data and the metadata envelope.
 * @param {File} file The file to encrypt.
 * @param {string} downloadCode The secret code for decryption.
 * @param {string} [instructions] Optional instructions to encrypt alongside the file.
 * @returns {Promise<{ ciphertext: ArrayBuffer, envelope: object }>} The encrypted file content and its metadata.
 */
export async function encryptFile(file: File, downloadCode: string, instructions?: string) {
  // 1. Generate a unique, random key for this specific file.
  const fileKey = await generateFileKey();
  
  // 2. Generate a random salt for the key derivation.
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  
  // 3. Derive a Key Encrypting Key (KEK) from the download code and salt.
  const kek = await deriveKek(downloadCode, salt);
  
  // 4. Encrypt the fileKey with the KEK. This is "key wrapping".
  const { wrappedKey, iv: wrapIv } = await wrapFileKey(fileKey, kek);

  // 5. Encrypt the actual file content with the fileKey.
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const fileBuffer = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: KEY_ALG, iv: iv },
    fileKey,
    fileBuffer
  );

  // 6. Encrypt optional instructions with the same fileKey.
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

  // 7. Assemble the "envelope" of metadata needed for decryption.
  // The original fileKey is NOT included here.
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

/**
 * Recovers the file key on the receiver's end.
 * It re-derives the KEK and uses it to unwrap the file key from the envelope.
 * @param {any} envelope The metadata envelope from the database.
 * @param {string} downloadCode The secret code provided by the user.
 * @returns {Promise<CryptoKey>} The decrypted file key.
 */
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

/**
 * Decrypts the file content using the recovered file key.
 * @param {ArrayBuffer} ciphertext The encrypted file data.
 * @param {any} envelope The metadata envelope.
 * @param {CryptoKey} fileKey The now-decrypted file key.
 * @returns {Promise<Blob>} The decrypted file as a Blob.
 */
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

/**
 * Decrypts the sender's instructions, if they exist.
 * @param {any} envelope The metadata envelope.
 * @param {CryptoKey} fileKey The decrypted file key.
 * @returns {Promise<string | null>} The decrypted instructions or null.
 */
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
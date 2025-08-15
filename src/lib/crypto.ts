/**
 * Secure, client-side encryption utilities using the Web Crypto API.
 * Derives a key from a passphrase, salt, timestamp, and device fingerprint.
 * Uses AES-256-GCM for encryption.
 */

/**
 * Generates a cryptographically secure random salt.
 * @returns {string} A hex-encoded salt.
 */
export function generateSalt(): string {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gathers device-specific information to use as part of the key derivation.
 * This makes the key specific to the device, meaning decryption will fail on a different device.
 * @returns {string} A string representing the device fingerprint.
 */
export function getDeviceFingerprint(): string {
  const { userAgent, platform } = navigator;
  const { width, height, colorDepth } = window.screen;
  return `${userAgent}|${platform}|${width}x${height}|${colorDepth}`;
}

/**
 * Derives a 256-bit key using SHA-256 from combined factors.
 * @param {string} passphrase
 * @param {string} salt (hex)
 * @param {string} timestamp (ISO string)
 * @param {string} fingerprint
 * @returns {Promise<CryptoKey>} The derived CryptoKey for AES-GCM.
 */
async function deriveKey(passphrase: string, salt: string, timestamp: string, fingerprint: string): Promise<CryptoKey> {
  const combined = `${passphrase}|${salt}|${timestamp}|${fingerprint}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);

  return window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext using a passphrase and multi-factor key derivation.
 * @param {string} plaintext - The text to encrypt.
 * @param {string} passphrase - The user's passphrase.
 * @returns {Promise<string>} A JSON string containing the encrypted data and parameters needed for decryption.
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const salt = generateSalt();
  const timestamp = new Date().toISOString();
  const fingerprint = getDeviceFingerprint();
  
  const key = await deriveKey(passphrase, salt, timestamp, fingerprint);

  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bits is recommended for AES-GCM.
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedPlaintext
  );

  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

  return JSON.stringify({
    salt,
    timestamp,
    iv: ivHex,
    ciphertext,
  }, null, 2);
}

/**
 * Decrypts a ciphertext package using a passphrase.
 * @param {string} jsonPayload - The JSON string from the encryption process.
 * @param {string} passphrase - The user's passphrase.
 * @returns {Promise<string>} The decrypted plaintext.
 */
export async function decrypt(jsonPayload: string, passphrase: string): Promise<string> {
  let payload: { salt: string; timestamp: string; iv: string; ciphertext: string; };
  try {
    payload = JSON.parse(jsonPayload);
  } catch (e) {
    throw new Error("Invalid data format. Expected a JSON object.");
  }

  const { salt, timestamp, iv: ivHex, ciphertext } = payload;
  if (!salt || !timestamp || !ivHex || !ciphertext) {
    throw new Error("Invalid data structure. Missing salt, timestamp, iv, or ciphertext.");
  }

  const fingerprint = getDeviceFingerprint();
  const key = await deriveKey(passphrase, salt, timestamp, fingerprint);

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const ciphertextBuffer = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error("Decryption failed. Check if the passphrase is correct and you are using the same device/browser.");
  }
}
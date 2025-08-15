/**
 * Custom encryption utilities for secure file sharing
 * Uses character mapping, string reversal, and optional Base64 encoding
 */

export interface CharacterMapping {
  [key: string]: string;
}

export interface EncryptionOptions {
  useBase64?: boolean;
  customMapping?: CharacterMapping;
}

// Default character mapping for demonstration
export const DEFAULT_MAPPING: CharacterMapping = {
  'a': 'x', 'b': 'y', 'c': 'z', 'd': 'w', 'e': 'v', 'f': 'u', 'g': 't', 'h': 's',
  'i': 'r', 'j': 'q', 'k': 'p', 'l': 'o', 'm': 'n', 'n': 'm', 'o': 'l', 'p': 'k',
  'q': 'j', 'r': 'i', 's': 'h', 't': 'g', 'u': 'f', 'v': 'e', 'w': 'd', 'x': 'c',
  'y': 'b', 'z': 'a',
  'A': 'X', 'B': 'Y', 'C': 'Z', 'D': 'W', 'E': 'V', 'F': 'U', 'G': 'T', 'H': 'S',
  'I': 'R', 'J': 'Q', 'K': 'P', 'L': 'O', 'M': 'N', 'O': 'L', 'P': 'K',
  'Q': 'J', 'R': 'I', 'S': 'H', 'T': 'G', 'U': 'F', 'V': 'E', 'W': 'D', 'X': 'C',
  'Y': 'B', 'Z': 'A',
  '0': '9', '1': '8', '2': '7', '3': '6', '4': '5', '6': '3', '7': '2',
  '8': '1', '9': '0',
  ' ': '~', '!': '@', '"': '#', '$': '%', '%': '^', '&': '*',
  '(': ')', '-': '_', '=': '+', '[': '}', ']': '{',
  '{': ']', '}': '[', '\\': '|', ';': ':', ':': ';', "'": '`',
  ',': '>', '.': '<', '?': '/', '/': '?'
};

/**
 * Creates an inverse mapping for decryption
 */
export function createInverseMapping(mapping: CharacterMapping): CharacterMapping {
  const inverse: CharacterMapping = {};
  for (const [key, value] of Object.entries(mapping)) {
    inverse[value] = key;
  }
  return inverse;
}

/**
 * Applies character mapping to a string
 */
function applyMapping(text: string, mapping: CharacterMapping): string {
  return text.split('').map(char => mapping[char] || char).join('');
}

/**
 * Reverses a string
 */
function reverseString(text: string): string {
  return text.split('').reverse().join('');
}

/**
 * Encrypts text using the custom scheme
 */
export function encryptText(text: string, options: EncryptionOptions = {}): string {
  const { useBase64 = false, customMapping = DEFAULT_MAPPING } = options;
  
  try {
    // Step 1: Apply character mapping
    let encrypted = applyMapping(text, customMapping);
    
    // Step 2: Reverse the string
    encrypted = reverseString(encrypted);
    
    // Step 3: Optional Base64 encoding
    if (useBase64) {
      encrypted = btoa(encrypted);
    }
    
    return encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts text using the custom scheme
 */
export function decryptText(encryptedText: string, options: EncryptionOptions = {}): string {
  const { useBase64 = false, customMapping = DEFAULT_MAPPING } = options;
  
  try {
    let decrypted = encryptedText;
    
    // Step 1: Optional Base64 decoding
    if (useBase64) {
      decrypted = atob(decrypted);
    }
    
    // Step 2: Reverse the string back
    decrypted = reverseString(decrypted);
    
    // Step 3: Apply inverse character mapping
    const inverseMapping = createInverseMapping(customMapping);
    decrypted = applyMapping(decrypted, inverseMapping);
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates if a string is valid Base64
 */
export function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

/**
 * Converts mapping object to editable string format
 */
export function mappingToString(mapping: CharacterMapping): string {
  return Object.entries(mapping)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

/**
 * Parses mapping from string format
 */
export function stringToMapping(str: string): CharacterMapping {
  const mapping: CharacterMapping = {};
  const lines = str.trim().split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const [key, value] = trimmedLine.split('=');
    if (key && value) {
      mapping[key] = value;
    }
  }
  
  return mapping;
}
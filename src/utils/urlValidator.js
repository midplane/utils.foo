// URL parameter validation utilities

/**
 * Validates and sanitizes a string parameter
 * @param {string} value - The value to validate
 * @param {number} maxLength - Maximum allowed length (default: 10000)
 * @returns {string|null} - Validated string or null if invalid
 */
export const validateStringParam = (value, maxLength = 10000) => {
  if (typeof value !== 'string') return null;
  if (value.length > maxLength) return null;
  
  // Basic XSS prevention - remove potentially dangerous characters
  const sanitized = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim();
    
  return sanitized;
};

/**
 * Validates algorithm parameter for hash generator
 * @param {string} algorithm - Algorithm name
 * @returns {string} - Valid algorithm or default 'SHA256'
 */
export const validateAlgorithm = (algorithm) => {
  const validAlgorithms = ['MD5', 'SHA1', 'SHA256', 'SHA384', 'SHA512', 'SHA3', 'RIPEMD160'];
  return validAlgorithms.includes(algorithm) ? algorithm : 'SHA256';
};

/**
 * Validates mode parameter for encoding/decoding utilities
 * @param {string} mode - Mode ('encode' or 'decode')
 * @param {string} defaultMode - Default mode if validation fails
 * @returns {string} - Valid mode
 */
export const validateMode = (mode, defaultMode = 'encode') => {
  const validModes = ['encode', 'decode'];
  return validModes.includes(mode) ? mode : defaultMode;
};

/**
 * Validates and sanitizes JSON parameter
 * @param {string} jsonString - JSON string to validate
 * @returns {string|null} - Valid JSON string or null
 */
export const validateJsonParam = (jsonString) => {
  if (!jsonString || typeof jsonString !== 'string') return null;
  if (jsonString.length > 100000) return null; // 100KB limit
  
  try {
    // Try to parse to ensure it's valid JSON
    JSON.parse(jsonString);
    return jsonString;
  } catch {
    return null;
  }
};

/**
 * Validates language parameter for diff utility
 * @param {string} lang - Language parameter
 * @returns {string} - Valid language or 'text'
 */
export const validateLanguage = (lang) => {
  const validLanguages = ['text', 'json', 'javascript', 'html', 'css', 'xml', 'yaml'];
  return validLanguages.includes(lang) ? lang : 'text';
};
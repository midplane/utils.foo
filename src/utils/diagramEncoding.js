import LZ from 'lz-string';

/**
 * Encode diagram data using LZ compression and Base64
 * This produces shorter URLs than URL encoding
 * @param {string} data - The diagram code
 * @returns {string} - Compressed and encoded data
 */
export const encodeDiagram = (data) => {
  try {
    const compressed = LZ.compressToBase64(data);
    // Replace URL-unsafe characters with safe alternatives
    return compressed
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (err) {
    console.error('Encoding error:', err);
    // Fallback to URL encoding if compression fails
    return encodeURIComponent(data);
  }
};

/**
 * Decode diagram data from compressed Base64
 * @param {string} encoded - The encoded diagram data
 * @returns {string} - The original diagram code
 */
export const decodeDiagram = (encoded) => {
  try {
    if (!encoded) return '';

    // Restore URL-safe characters to standard Base64
    const restored = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      // Add padding if needed
      .padEnd(encoded.length + (4 - (encoded.length % 4)) % 4, '=');

    const decompressed = LZ.decompressFromBase64(restored);
    return decompressed || '';
  } catch (err) {
    console.error('Decoding error:', err);
    // Fallback to URL decoding if decompression fails
    try {
      return decodeURIComponent(encoded);
    } catch {
      return '';
    }
  }
};

/**
 * Get compression ratio (useful for showing users the benefit)
 * @param {string} original - Original data
 * @param {string} compressed - Compressed data
 * @returns {number} - Percentage reduction
 */
export const getCompressionRatio = (original, compressed) => {
  if (original.length === 0) return 0;
  return Math.round((1 - compressed.length / original.length) * 100);
};

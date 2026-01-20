import { parseMetadata, serializeWithMetadata, type ChordFileMetadata } from '../chordFileUtils';

/**
 * Metadata Service
 * Handles metadata parsing, updating, and key operations
 */

export interface KeyUpdateResult {
  updated: boolean;
  content: string;
  keyNumber: number;
}

/**
 * Ensure the file has a numeric key in metadata (0-11)
 * If no key exists or it's non-numeric, use detected key
 * Returns whether content was updated, the new content, and the key number
 */
export function ensureNumericKey(content: string): KeyUpdateResult {
  const result = parseMetadata(content);
  
  // Check if the current key is already in numeric format (0-11)
  const currentKeyIsNumeric = result.metadata.key && 
    /^\d+$/.test(result.metadata.key.trim()) &&
    parseInt(result.metadata.key.trim()) >= 0 && 
    parseInt(result.metadata.key.trim()) <= 11;

  if (currentKeyIsNumeric) {
    // Already numeric, no update needed
    return {
      updated: false,
      content,
      keyNumber: parseInt(result.metadata.key.trim()),
    };
  }

  // Determine key to use
  let keyNumber: number;
  if (result.specifiedKey !== null) {
    // Use specified key converted to numeric
    keyNumber = result.specifiedKey;
  } else {
    // Use detected key
    keyNumber = result.detectedKey ?? 0;
  }

  // Update metadata with numeric key
  result.metadata.key = keyNumber.toString();
  const updatedContent = serializeWithMetadata(result.metadata, result.contentWithoutMetadata);

  return {
    updated: true,
    content: updatedContent,
    keyNumber,
  };
}

/**
 * Transpose the key by a given offset (in semitones)
 * Updates the key metadata and returns new content and key number
 */
export function transposeKey(content: string, offset: number): KeyUpdateResult {
  // First ensure we have numeric key
  const ensureResult = ensureNumericKey(content);
  
  // Calculate new key
  const newKeyNumber = ((ensureResult.keyNumber + offset) % 12 + 12) % 12;
  
  // Parse and update metadata
  const result = parseMetadata(ensureResult.content);
  result.metadata.key = newKeyNumber.toString();
  const updatedContent = serializeWithMetadata(result.metadata, result.contentWithoutMetadata);

  return {
    updated: true,
    content: updatedContent,
    keyNumber: newKeyNumber,
  };
}

/**
 * Get the current key number from content
 * Ensures numeric format first
 */
export function getCurrentKey(content: string): number {
  const result = ensureNumericKey(content);
  return result.keyNumber;
}

/**
 * Update metadata fields
 */
export function updateMetadata(content: string, updates: Partial<ChordFileMetadata>): string {
  const result = parseMetadata(content);
  const updatedMetadata = { ...result.metadata, ...updates };
  return serializeWithMetadata(updatedMetadata, result.contentWithoutMetadata);
}

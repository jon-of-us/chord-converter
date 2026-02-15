import { parseChordFile, serializeChordFile } from './chordFileService';
import type { ChordFile } from '../models/ChordFile';

/**
 * Metadata Service
 * Handles metadata operations on ChordFile objects
 */

export interface KeyUpdateResult {
  updated: boolean;
  chordFile: ChordFile;
  content: string;
  keyNumber: number;
}

/**
 * Ensure the ChordFile has a numeric key in metadata (0-11)
 * If no key exists or it's non-numeric, use detected key
 * Returns whether content was updated, the ChordFile, new content, and the key number
 */
export function ensureNumericKey(chordFile: ChordFile): KeyUpdateResult {
  // Check if the current key is already in numeric format (0-11)
  const currentKeyIsNumeric = chordFile.metadata.key && 
    /^\d+$/.test(chordFile.metadata.key.trim()) &&
    parseInt(chordFile.metadata.key.trim()) >= 0 && 
    parseInt(chordFile.metadata.key.trim()) <= 11;

  if (currentKeyIsNumeric) {
    // Already numeric, no update needed
    return {
      updated: false,
      chordFile,
      content: serializeChordFile(chordFile),
      keyNumber: parseInt(chordFile.metadata.key.trim()),
    };
  }

  // Determine key to use
  let keyNumber: number;
  if (chordFile.specifiedKey !== null) {
    keyNumber = chordFile.specifiedKey;
  } else {
    keyNumber = chordFile.detectedKey ?? 0;
  }

  // Update metadata with numeric key
  const updatedChordFile = {
    ...chordFile,
    metadata: { ...chordFile.metadata, key: keyNumber.toString() }
  };
  const updatedContent = serializeChordFile(updatedChordFile);

  return {
    updated: true,
    chordFile: updatedChordFile,
    content: updatedContent,
    keyNumber,
  };
}

/**
 * Transpose ChordFile by offset
 */
export function transposeKey(chordFile: ChordFile, offset: number): KeyUpdateResult {
  // First ensure we have numeric key
  const ensureResult = ensureNumericKey(chordFile);
  
  // Calculate new key
  const newKeyNumber = ((ensureResult.keyNumber + offset) % 12 + 12) % 12;
  
  // Update metadata
  const updatedChordFile = {
    ...ensureResult.chordFile,
    metadata: { ...ensureResult.chordFile.metadata, key: newKeyNumber.toString() }
  };
  const updatedContent = serializeChordFile(updatedChordFile);

  return {
    updated: true,
    chordFile: updatedChordFile,
    content: updatedContent,
    keyNumber: newKeyNumber,
  };
}


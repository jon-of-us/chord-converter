import * as ChordFileModel from '../models/ChordFile';

/**
 * Metadata Service
 * Handles metadata operations on ChordFile objects
 */

export interface KeyUpdateResult {
  updated: boolean;
  chordFile: ChordFileModel.ChordFile;
  content: string;
  keyNumber: number;
}

/**
 * Ensure the ChordFile has a numeric key in metadata (0-11)
 * If no key exists or it's non-numeric, use detected key
 * Returns whether content was updated, the ChordFile, new content, and the key number
 */
export function ensureNumericKey(chordFile: ChordFileModel.ChordFile): KeyUpdateResult {
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
      content: chordFile.serialize(),
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
  const updatedChordFile = new ChordFileModel.ChordFile(
    { ...chordFile.metadata, key: keyNumber.toString() },
    chordFile.specifiedKey,
    chordFile.detectedKey,
    chordFile.lines
  );
  const updatedContent = updatedChordFile.serialize();

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
export function transposeKey(chordFile: ChordFileModel.ChordFile, offset: number): KeyUpdateResult {
  // First ensure we have numeric key
  const ensureResult = ensureNumericKey(chordFile);
  
  // Calculate new key
  const newKeyNumber = ((ensureResult.keyNumber + offset) % 12 + 12) % 12;
  
  // Update metadata
  const updatedChordFile = new ChordFileModel.ChordFile(
    { ...ensureResult.chordFile.metadata, key: newKeyNumber.toString() },
    ensureResult.chordFile.specifiedKey,
    ensureResult.chordFile.detectedKey,
    ensureResult.chordFile.lines
  );
  const updatedContent = updatedChordFile.serialize();

  return {
    updated: true,
    chordFile: updatedChordFile,
    content: updatedContent,
    keyNumber: newKeyNumber,
  };
}


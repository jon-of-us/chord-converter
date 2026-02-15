/**
 * ChordFile data model
 * Represents a parsed .chords file with all its content structured
 */

import type { Chord } from '../chords/chordTypes';

export interface ChordFileMetadata {
  title: string;
  artist: string;
  key: string; // The key specified in metadata (can be various formats)
  info: string;
  [key: string]: string; // Allow any additional metadata fields
}

export interface ChordOrWord {
  content: Chord | string;
  isChord: boolean;
  position: number; // Character position in line
}

export interface ParsedLine {
  type: 'empty' | 'heading' | 'subheading' | 'chords' | 'lyrics';
  content: string; // Original line content
  chordsOrWords?: ChordOrWord[]; // Only for 'chords' type lines
}

/**
 * Represents a fully parsed chord file
 */
export interface ChordFile {
  metadata: ChordFileMetadata;
  specifiedKey: number | null; // Parsed numeric key from metadata (0-11)
  detectedKey: number | null; // Key detected from chords (0-11)
  lines: ParsedLine[];
  allChords: Chord[]; // All chords in the file (for convenience)
}

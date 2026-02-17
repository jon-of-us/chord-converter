/**
 * ChordFile data model
 * Represents a parsed .chords file with all its content structured
 */

import type { Chord } from "../chords/chordTypes";

export interface ChordFileMetadata {
  title: string;
  artist: string;
  key: string; // The key specified in metadata (can be various formats)
  info: string;
  [key: string]: string; // Allow any additional metadata fields
}

export class ChordOrWord {
  constructor(
    public content: Chord | string,
    public position: number, // Character position in line
    public markerId: string, // Unique ID for linking chords to lyrics
  ) {}
}

export class ParsedLine {
  constructor(
    public type: "empty" | "heading" | "subheading" | "chords" | "lyrics",
    public content: string,
    public maxChordPosition: number = 0,
    public chordsOrWords?: ChordOrWord[],
  ) {}
}

/**
 * Represents a fully parsed chord file
 */
export class ChordFile {
  constructor(
    public metadata: ChordFileMetadata,
    public specifiedKey: number, // Parsed numeric key from metadata (0-11)
    public detectedKey: number, // Key detected from chords (0-11)
    public lines: ParsedLine[],
  ) {}
}

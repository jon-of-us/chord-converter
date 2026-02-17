/**
 * ChordFile data model
 * Represents a parsed .chords file with all its content structured
 */

import * as chordTypes from '../chords/chordTypes';
import * as ChordParser from '../chords/chordParser';
import * as KeyUtils from '../chords/keyUtils';
import * as KeyDetection from '../chords/keyDetection';
import { fileConfig } from '../config';

export interface ChordFileMetadata {
  title: string;
  artist: string;
  key: string; // The key specified in metadata (can be various formats)
  info: string;
  [key: string]: string; // Allow any additional metadata fields
}

export class ChordOrWord {
  constructor(
    public content: chordTypes.Chord | string,
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

  /**
   * Parse .chords file content into a structured ChordFile object
   * The chords are always stored in C major
   */
  static parse(content: string): ChordFile {
    const lines = content.split('\n');

    // Parse metadata
    const { metadata, specifiedKeyStr, metadataEndIndex } = ChordFile.parseMetadata(lines);

    // Parse lines after metadata
    const contentLines = lines.slice(metadataEndIndex);
    const parsedLines: ParsedLine[] = [];
    const allChords: chordTypes.Chord[] = [];

    // Track metadata end for blank line insertion
    let metadataEndIdx = metadataEndIndex > 0 ? 0 : -1; // First line after metadata
    let metadataEnded = false;

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine === '') {
        parsedLines.push(new ParsedLine('empty', line));
        continue;
      }

      // First non-empty line is the heading (title) if not in metadata
      if (i === 0 && metadataEndIndex === 0) {
        let titleContent = line;
        if (titleContent.toLowerCase().startsWith('title:')) {
          titleContent = titleContent.substring(6).trim();
        }
        parsedLines.push(new ParsedLine('heading', titleContent));
        continue;
      }

      // Add blank line after metadata ends
      if (!metadataEnded && metadataEndIdx === 0) {
        parsedLines.push(new ParsedLine("empty", ''));
        metadataEnded = true;
      }

      const lineType = ChordFile.getLineType(line);

      if (lineType === 'chords') {
        const chordsOrWords = ChordFile.parseChordsFromLine(line, i);
        // Collect all chords and find max chord position 
        let maxChordPosition = 0;
        for (const cow of chordsOrWords) {
          if (cow.content instanceof chordTypes.Chord) {
            allChords.push(cow.content);
            maxChordPosition = Math.max(maxChordPosition, cow.position);
          }
        }

        parsedLines.push(new ParsedLine(
          'chords',
          line,
          maxChordPosition,
          chordsOrWords
        ));
      } else if (lineType === 'subheading') {
        parsedLines.push(new ParsedLine('subheading', line));
      } else if (lineType === 'lyrics') {
        parsedLines.push(new ParsedLine('lyrics', line));
      } else {
        parsedLines.push(new ParsedLine('empty', line));
      }
    }

    // transpose to C major
    const detectedKey = KeyDetection.detectKeyFromChords(allChords);
    const offset = (12 + 4 - detectedKey) % 12; 

    // Parse specified key
    const specifiedKey = KeyUtils.parseKeyString(specifiedKeyStr) ?? detectedKey;

    for (const line of parsedLines) {
      if (line.type === 'chords' && line.chordsOrWords) {
        for (const cow of line.chordsOrWords) {
          if (cow.content instanceof chordTypes.Chord) {
            cow.content.root = (cow.content.root + offset) % 12;
          }
        }
      }
    }

    return new ChordFile(metadata, specifiedKey, detectedKey, parsedLines);
  }

  /**
   * Serialize this ChordFile back to string format
   */
  serialize(): string {
    const parts: string[] = [];
    const knownFields = ['title', 'artist', 'key', 'info'];

    // Always include title first
    const title = this.metadata.title || fileConfig.defaultTitle;
    parts.push(`Title: ${title}`);

    // Then artist if present
    if (this.metadata.artist) {
      parts.push(`Artist: ${this.metadata.artist}`);
    }

    // Then key (convert to numeric format if valid)
    if (this.metadata.key && this.metadata.key.trim() !== '') {
      const keyNum = KeyUtils.parseKeyString(this.metadata.key);
      if (keyNum !== null) {
        parts.push(`Key: ${keyNum.toString()}`);
      } else {
        // Keep original if parsing fails
        parts.push(`Key: ${this.metadata.key}`);
      }
    }

    // Then info if present
    if (this.metadata.info) {
      parts.push(`Info: ${this.metadata.info}`);
    }

    // Add any additional metadata fields not in the known list
    for (const [key, value] of Object.entries(this.metadata)) {
      if (!knownFields.includes(key.toLowerCase()) && typeof value === 'string') {
        parts.push(`${key}: ${value}`);
      }
    }

    // Add empty lines between metadata and content if there are lines
    if (parts.length > 0 && this.lines.length > 0) {
      parts.push('');
      parts.push('');
    }

    // Add all lines (they contain their original content)
    for (const line of this.lines) {
      parts.push(line.content);
    }

    return parts.join('\n');
  }

  /**
   * Determine the type of a line
   */
  private static getLineType(line: string): 'empty' | 'subheading' | 'chords' | 'lyrics' {
    const s = line.trim();
    if (s.length === 0) return 'empty';
    if (s.startsWith('[')) return 'subheading';

    const split = line.split(' ').filter((w) => w !== '');
    if (split.length === 0) return 'empty';

    const wordsNoSlash = split.map((w) => w.split('/')[0]);
    const nWords = wordsNoSlash.length;
    const isChord = wordsNoSlash.map(
      (w) => ChordParser.parseChord(w) !== null || w === '|' || w === '.',
    );
    const nChords = isChord.filter(Boolean).length;

    if (nChords / Math.max(1, nWords) > 0.35) return 'chords';
    return 'lyrics';
  }

  /**
   * Parse metadata from the beginning of file content
   */
  private static parseMetadata(lines: string[]): {
    metadata: ChordFileMetadata;
    specifiedKeyStr: string;
    metadataEndIndex: number;
  } {
    const metadata: ChordFileMetadata = {
      title: fileConfig.defaultTitle,
      artist: fileConfig.defaultArtist,
      key: fileConfig.defaultKey,
      info: fileConfig.defaultInfo,
    };

    let metadataEndIndex = 0;
    let firstNonEmptyLineIdx = -1;
    let hasTitle = false;
    let specifiedKeyStr = '';
    let inMetadataSection = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines at beginning or within metadata
      if (trimmedLine === '') {
        if (inMetadataSection) {
          metadataEndIndex = i + 1;
          continue;
        }
      }

      // Check if this line is metadata (contains : and is before content)
      const colonIndex = trimmedLine.indexOf(':');
      if (inMetadataSection && colonIndex > 0) {
        const fieldName = trimmedLine.substring(0, colonIndex).trim();
        const fieldValue = trimmedLine.substring(colonIndex + 1).trim();
        const lowerFieldName = fieldName.toLowerCase();

        // Store in appropriate field
        if (lowerFieldName === 'title') {
          metadata.title = fieldValue;
          hasTitle = true;
        } else if (lowerFieldName === 'artist') {
          metadata.artist = fieldValue;
        } else if (lowerFieldName === 'key') {
          specifiedKeyStr = fieldValue;
          metadata.key = fieldValue;
        } else if (lowerFieldName === 'info') {
          metadata.info = fieldValue;
        } else {
          // Store any other metadata field
          metadata[fieldName] = fieldValue;
        }

        metadataEndIndex = i + 1;
      } else if (trimmedLine !== '') {
        // Found first non-metadata line (no colon)
        if (firstNonEmptyLineIdx === -1) {
          firstNonEmptyLineIdx = i;
        }
        inMetadataSection = false;

        if (!hasTitle) {
          break;
        } else {
          break;
        }
      }
    }

    // Handle first non-empty line if no Title was found
    if (!hasTitle && firstNonEmptyLineIdx >= 0) {
      const firstLine = lines[firstNonEmptyLineIdx].trim();
      metadata.title = firstLine;
      metadataEndIndex = firstNonEmptyLineIdx + 1;
    }

    return { metadata, specifiedKeyStr, metadataEndIndex };
  }

  /**
   * Parse chords from a chord line
   */
  private static parseChordsFromLine(line: string, lineIndex: number): ChordOrWord[] {
    const result: ChordOrWord[] = [];
    const split = line.split(' ');
    let position = 0;

    for (const tok of split) {
      if (tok === '') {
        position += 1;
        continue;
      }

      const parsed = ChordParser.parseChord(tok);
      result.push(
        new ChordOrWord(
          parsed || tok,
          position,
          `mk-${lineIndex}-${position}`
        )
      );
      position += tok.length + 1;
    }

    return result;
  }

  /**
   * Ensure the ChordFile has a numeric key in metadata (0-11)
   * If no key exists or it's non-numeric, use detected or specified key
   * Mutates the metadata.key if needed
   * Returns the key number
   */
  ensureNumericKey(): number {
    // Check if the current key is already in numeric format (0-11)
    const currentKeyIsNumeric = this.metadata.key && 
      /^\d+$/.test(this.metadata.key.trim()) &&
      parseInt(this.metadata.key.trim()) >= 0 && 
      parseInt(this.metadata.key.trim()) <= 11;

    if (currentKeyIsNumeric) {
      return parseInt(this.metadata.key.trim());
    }

    // Determine key to use
    let keyNumber: number;
    if (this.specifiedKey !== null) {
      keyNumber = this.specifiedKey;
    } else {
      keyNumber = this.detectedKey ?? 0;
    }

    // Update metadata with numeric key
    this.metadata.key = keyNumber.toString();
    
    return keyNumber;
  }

  /**
   * Transpose the key by semitone offset
   * Mutates the metadata.key
   */
  transpose(offset: number): void {
    // First ensure we have numeric key
    const currentKey = this.ensureNumericKey();
    
    // Calculate new key
    const newKey = ((currentKey + offset) % 12 + 12) % 12;
    
    // Update metadata
    this.metadata.key = newKey.toString();
  }
}

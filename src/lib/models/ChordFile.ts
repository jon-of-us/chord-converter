/**
 * ChordFile data model
 * Represents a parsed .chords file with all its content structured
 */

import * as chordTypes from '../chords/chordTypes';
import * as ChordParser from '../chords/chordParser';
import * as KeyUtils from '../chords/keyUtils';
import * as KeyDetection from '../chords/keyDetection';
import { fileConfig } from '../config';

// Metadata is now stored directly in parsedLines with type="metadata"

export class ChordOrWord {
  constructor(
    public content: chordTypes.Chord | string,
    public position: number, // Character position in line
    public markerId: string, // Unique ID for linking chords to lyrics
  ) {}
}

export class ParsedLine {
  constructor(
    public type: "empty" | "heading" | "subheading" | "chords" | "lyrics" | "metadata" | "spacer",
    public content: string,
    public maxChordPosition: number = 0,
    public chordsOrWords?: ChordOrWord[],
    public metadataField?: string, // For metadata lines: "title", "artist", "key", "info", etc.
  ) {}
}

/**
 * Represents a fully parsed chord file
 */
export class ChordFile {
  constructor(
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

    const parsedLines: ParsedLine[] = [];
    const allChords: chordTypes.Chord[] = [];
    
    // Parse metadata and add to parsedLines
    const { metadataLines, specifiedKeyStr, contentStartIndex } = ChordFile.parseMetadata(lines);
    parsedLines.push(...metadataLines);

    // Add blank lines after metadata if we have metadata
    if (metadataLines.length > 0) {
      parsedLines.push(new ParsedLine('spacer', ''));
      parsedLines.push(new ParsedLine('spacer', ''));
    }

    // Parse lines after metadata
    const contentLines = lines.slice(contentStartIndex);

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine === '') {
        parsedLines.push(new ParsedLine('empty', line));
        continue;
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

    return new ChordFile(specifiedKey, detectedKey, parsedLines);
  }

  /**
   * Serialize this ChordFile back to string format
   */
  serialize(): string {
    const parts: string[] = [];

    // Serialize from parsedLines
    for (const line of this.lines) {
      if (line.type === 'metadata' && line.metadataField) {
        // Format metadata line with proper capitalization
        const fieldName = line.metadataField.charAt(0).toUpperCase() + line.metadataField.slice(1);
        
        // Special handling for key field - convert to numeric if possible
        if (line.metadataField.toLowerCase() === 'key') {
          const keyNum = KeyUtils.parseKeyString(line.content);
          if (keyNum !== null) {
            parts.push(`${fieldName}: ${keyNum.toString()}`);
          } else {
            parts.push(`${fieldName}: ${line.content}`);
          }
        } else {
          parts.push(`${fieldName}: ${line.content}`);
        }
      } else if (line.type === 'empty') {
        parts.push('');
      } else {
        // For all other line types, use original content
        parts.push(line.content);
      }
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
    metadataLines: ParsedLine[];
    specifiedKeyStr: string;
    contentStartIndex: number;
  } {
    const metadataLines: ParsedLine[] = [];
    let contentStartIndex = 0;
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
          contentStartIndex = i + 1;
          continue;
        }
      }

      // Check if this line is metadata (contains : and is before content)
      const colonIndex = trimmedLine.indexOf(':');
      if (inMetadataSection && colonIndex > 0) {
        const fieldName = trimmedLine.substring(0, colonIndex).trim();
        const fieldValue = trimmedLine.substring(colonIndex + 1).trim();
        const lowerFieldName = fieldName.toLowerCase();

        // Store as metadata line
        metadataLines.push(new ParsedLine('metadata', fieldValue, 0, undefined, lowerFieldName));
        
        if (lowerFieldName === 'title') {
          hasTitle = true;
        } else if (lowerFieldName === 'key') {
          specifiedKeyStr = fieldValue;
        }

        contentStartIndex = i + 1;
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
      metadataLines.unshift(new ParsedLine('metadata', firstLine, 0, undefined, 'title'));
      contentStartIndex = firstNonEmptyLineIdx + 1;
    } else if (!hasTitle) {
      // Add default title if none found
      metadataLines.unshift(new ParsedLine('metadata', fileConfig.defaultTitle, 0, undefined, 'title'));
    }

    return { metadataLines, specifiedKeyStr, contentStartIndex };
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
   * Mutates the key line in parsedLines if needed
   * Returns the key number
   */
  ensureNumericKey(): number {
    // Find key line in parsedLines
    const keyLine = this.lines.find(l => l.type === 'metadata' && l.metadataField?.toLowerCase() === 'key');
    
    // Check if the current key is already in numeric format (0-11)
    const currentKeyIsNumeric = keyLine && keyLine.content &&
      /^\d+$/.test(keyLine.content.trim()) &&
      parseInt(keyLine.content.trim()) >= 0 && 
      parseInt(keyLine.content.trim()) <= 11;

    if (currentKeyIsNumeric) {
      return parseInt(keyLine.content.trim());
    }

    // Determine key to use
    let keyNumber: number;
    if (this.specifiedKey !== null) {
      keyNumber = this.specifiedKey;
    } else {
      keyNumber = this.detectedKey ?? 0;
    }

    // Update key line in parsedLines
    if (keyLine) {
      keyLine.content = keyNumber.toString();
    } else {
      // Add key line after title if it doesn't exist
      const titleIdx = this.lines.findIndex(l => l.type === 'metadata' && l.metadataField?.toLowerCase() === 'title');
      if (titleIdx >= 0) {
        this.lines.splice(titleIdx + 1, 0, new ParsedLine('metadata', keyNumber.toString(), 0, undefined, 'key'));
      } else {
        // Add at beginning
        this.lines.unshift(new ParsedLine('metadata', keyNumber.toString(), 0, undefined, 'key'));
      }
    }

    return keyNumber;
  }

  /**
   * Transpose the key by semitone offset
   * Mutates the key line in parsedLines
   */
  transpose(offset: number): void {
    // First ensure we have numeric key
    const currentKey = this.ensureNumericKey();
    
    // Calculate new key
    const newKey = ((currentKey + offset) % 12 + 12) % 12;
    
    // Update key line in parsedLines
    const keyLine = this.lines.find(l => l.type === 'metadata' && l.metadataField?.toLowerCase() === 'key');
    if (keyLine) {
      keyLine.content = newKey.toString();
    }
  }
}

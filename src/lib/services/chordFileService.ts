/**
 * ChordFile parsing service
 * Parses .chords file content into structured ChordFile objects
 */

import type { ChordFile, ChordFileMetadata, ParsedLine, ChordOrWord } from '../models/ChordFile';
import type { Chord } from '../chords/chordTypes';
import * as ChordParser from '../chords/chordParser';
import * as KeyUtils from '../chords/keyUtils';
import * as KeyDetection from '../chords/keyDetection';
import { fileConfig } from '../config';

/**
 * Determine the type of a line
 */
function getLineType(line: string): 'empty' | 'subheading' | 'chords' | 'lyrics' {
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
function parseMetadata(lines: string[]): {
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
function parseChordsFromLine(line: string): ChordOrWord[] {
  const result: ChordOrWord[] = [];
  const split = line.split(' ');
  let position = 0;

  for (const tok of split) {
    if (tok === '') {
      position += 1;
      continue;
    }

    const parsed = ChordParser.parseChord(tok);
    result.push({
      content: parsed || tok,
      isChord: parsed !== null,
      position,
    });

    position += tok.length + 1;
  }

  return result;
}

/**
 * Parse .chords file content into a structured ChordFile object
 */
export function parseChordFile(content: string): ChordFile {
  const lines = content.split('\n');

  // Parse metadata
  const { metadata, specifiedKeyStr, metadataEndIndex } = parseMetadata(lines);

  // Parse specified key
  const specifiedKey = specifiedKeyStr ? KeyUtils.parseKeyString(specifiedKeyStr) : null;

  // Parse lines after metadata
  const contentLines = lines.slice(metadataEndIndex);
  const parsedLines: ParsedLine[] = [];
  const allChords: Chord[] = [];

  // Track metadata end for blank line insertion
  let metadataEndIdx = metadataEndIndex > 0 ? 0 : -1; // First line after metadata
  let metadataEnded = false;

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === '') {
      parsedLines.push({ type: 'empty', content: line });
      continue;
    }

    // First non-empty line is the heading (title) if not in metadata
    if (i === 0 && metadataEndIndex === 0) {
      let titleContent = line;
      if (titleContent.toLowerCase().startsWith('title:')) {
        titleContent = titleContent.substring(6).trim();
      }
      parsedLines.push({ type: 'heading', content: titleContent });
      continue;
    }

    // Add blank line after metadata ends
    if (!metadataEnded && metadataEndIdx === 0) {
      parsedLines.push({ type: 'empty', content: '' });
      metadataEnded = true;
    }

    const lineType = getLineType(line);

    if (lineType === 'chords') {
      const chordsOrWords = parseChordsFromLine(line);
      // Collect all chords
      for (const cow of chordsOrWords) {
        if (cow.isChord) {
          allChords.push(cow.content as Chord);
        }
      }
      parsedLines.push({
        type: 'chords',
        content: line,
        chordsOrWords,
      });
    } else if (lineType === 'subheading') {
      parsedLines.push({ type: 'subheading', content: line });
    } else if (lineType === 'lyrics') {
      parsedLines.push({ type: 'lyrics', content: line });
    } else {
      parsedLines.push({ type: 'empty', content: line });
    }
  }

  // Detect key from all chords
  const detectedKey = KeyDetection.detectKeyFromChords(allChords);

  return {
    metadata,
    specifiedKey,
    detectedKey,
    lines: parsedLines,
    allChords,
  };
}

/**
 * Serialize a ChordFile back to string format
 */
export function serializeChordFile(chordFile: ChordFile): string {
  const parts: string[] = [];
  const knownFields = ['title', 'artist', 'key', 'info'];

  // Always include title first
  const title = chordFile.metadata.title || fileConfig.defaultTitle;
  parts.push(`Title: ${title}`);

  // Then artist if present
  if (chordFile.metadata.artist) {
    parts.push(`Artist: ${chordFile.metadata.artist}`);
  }

  // Then key (convert to numeric format if valid)
  if (chordFile.metadata.key && chordFile.metadata.key.trim() !== '') {
    const keyNum = KeyUtils.parseKeyString(chordFile.metadata.key);
    if (keyNum !== null) {
      parts.push(`Key: ${keyNum.toString()}`);
    } else {
      // Keep original if parsing fails
      parts.push(`Key: ${chordFile.metadata.key}`);
    }
  }

  // Then info if present
  if (chordFile.metadata.info) {
    parts.push(`Info: ${chordFile.metadata.info}`);
  }

  // Add any additional metadata fields not in the known list
  for (const [key, value] of Object.entries(chordFile.metadata)) {
    if (!knownFields.includes(key.toLowerCase()) && typeof value === 'string') {
      parts.push(`${key}: ${value}`);
    }
  }

  // Add empty lines between metadata and content if there are lines
  if (parts.length > 0 && chordFile.lines.length > 0) {
    parts.push('');
    parts.push('');
  }

  // Add all lines (they contain their original content)
  for (const line of chordFile.lines) {
    parts.push(line.content);
  }

  return parts.join('\n');
}

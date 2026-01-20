import { fileConfig } from '../config';
import * as KeyUtils from '../chords/keyUtils';
import * as KeyDetection from '../chords/keyDetection';

export interface ChordFileMetadata {
  title: string;
  artist: string;
  key: string; // The key specified in metadata (can be various formats)
  info: string;
}

export interface ChordFileWithKeys {
  metadata: ChordFileMetadata;
  specifiedKey: number | null; // Parsed numeric key from metadata
  detectedKey: number | null; // Key detected from chords
  contentWithoutMetadata: string;
}

/**
 * Parse metadata from the beginning of a .chords file
 * Ensures first non-empty line has "Title:" prefix
 * 
 * Returns both specified key (from metadata) and detected key (from chords)
 * These are tracked independently
 */
export function parseMetadata(content: string): ChordFileWithKeys {
  const lines = content.split('\n');
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines at beginning
    if (trimmedLine === '') {
      if (metadataEndIndex === 0) continue;
    }
    
    const lowerTrimmed = trimmedLine.toLowerCase();
    
    if (lowerTrimmed.startsWith('title:')) {
      metadata.title = trimmedLine.substring(6).trim();
      metadataEndIndex = i + 1;
      hasTitle = true;
    } else if (lowerTrimmed.startsWith('artist:')) {
      metadata.artist = trimmedLine.substring(7).trim();
      metadataEndIndex = i + 1;
    } else if (lowerTrimmed.startsWith('key:')) {
      specifiedKeyStr = trimmedLine.substring(4).trim();
      metadata.key = specifiedKeyStr;
      metadataEndIndex = i + 1;
    } else if (lowerTrimmed.startsWith('info:')) {
      metadata.info = trimmedLine.substring(5).trim();
      metadataEndIndex = i + 1;
    } else if (trimmedLine !== '') {
      // Found first non-metadata line
      if (firstNonEmptyLineIdx === -1) {
        firstNonEmptyLineIdx = i;
      }
      
      if (!hasTitle) {
        break;
      }
      
      if (!lowerTrimmed.startsWith('title:') && 
          !lowerTrimmed.startsWith('artist:') && 
          !lowerTrimmed.startsWith('key:') && 
          !lowerTrimmed.startsWith('info:')) {
        break;
      }
    }
  }

  // Handle first non-empty line if no Title was found
  if (!hasTitle && firstNonEmptyLineIdx >= 0) {
    const firstLine = lines[firstNonEmptyLineIdx].trim();
    // Add "Title: " prefix if not already present
    if (!firstLine.toLowerCase().startsWith('title:')) {
      metadata.title = firstLine;
    } else {
      metadata.title = firstLine.substring(6).trim();
    }
    metadataEndIndex = firstNonEmptyLineIdx + 1;
  }

  const contentWithoutMetadata = lines.slice(metadataEndIndex).join('\n').trim();

  // Parse specified key (from metadata)
  let specifiedKey: number | null = null;
  if (specifiedKeyStr) {
    specifiedKey = KeyUtils.parseKeyString(specifiedKeyStr);
  }

  // Detect key from chords (independent of specified key)
  const detectedKey = KeyDetection.detectKeyFromChords(content);

  return {
    metadata,
    specifiedKey,
    detectedKey,
    contentWithoutMetadata
  };
}

/**
 * Serialize metadata and content back into a .chords file format
 * Converts key to numeric format (1-12) if possible
 */
export function serializeWithMetadata(metadata: ChordFileMetadata, content: string): string {
  const parts: string[] = [];

  // Always include title
  const title = metadata.title || fileConfig.defaultTitle;
  parts.push(`Title: ${title}`);
  
  if (metadata.artist) {
    parts.push(`Artist: ${metadata.artist}`);
  }
  
  // Convert key to numeric format if valid
  if (metadata.key && metadata.key.trim() !== '') {
    const keyNum = KeyUtils.parseKeyString(metadata.key);
    if (keyNum !== null) {
      parts.push(`Key: ${keyNum.toString()}`);
    } else {
      // Keep original if parsing fails
      parts.push(`Key: ${metadata.key}`);
    }
  }
  
  if (metadata.info) {
    parts.push(`Info: ${metadata.info}`);
  }

  // Add empty lines between metadata and content if there's content
  if (parts.length > 0 && content.trim()) {
    parts.push('');
    parts.push('');
  }

  parts.push(content.trim());

  return parts.join('\n');
}


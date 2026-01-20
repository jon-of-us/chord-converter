import { fileConfig } from '../config';
import * as KeyUtils from '../chords/keyUtils';
import * as KeyDetection from '../chords/keyDetection';

export interface ChordFileMetadata {
  title: string;
  artist: string;
  key: string; // The key specified in metadata (can be various formats)
  info: string;
  [key: string]: string; // Allow any additional metadata fields
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
  const knownFields = ['title', 'artist', 'key', 'info'];

  // Always include title first
  const title = metadata.title || fileConfig.defaultTitle;
  parts.push(`Title: ${title}`);
  
  // Then artist if present
  if (metadata.artist) {
    parts.push(`Artist: ${metadata.artist}`);
  }
  
  // Then key (convert to numeric format if valid)
  if (metadata.key && metadata.key.trim() !== '') {
    const keyNum = KeyUtils.parseKeyString(metadata.key);
    if (keyNum !== null) {
      parts.push(`Key: ${keyNum.toString()}`);
    } else {
      // Keep original if parsing fails
      parts.push(`Key: ${metadata.key}`);
    }
  }
  
  // Then info if present
  if (metadata.info) {
    parts.push(`Info: ${metadata.info}`);
  }
  
  // Add any additional metadata fields not in the known list
  for (const [key, value] of Object.entries(metadata)) {
    if (!knownFields.includes(key.toLowerCase()) && typeof value === 'string') {
      parts.push(`${key}: ${value}`);
    }
  }

  // Add empty lines between metadata and content if there's content
  if (parts.length > 0 && content.trim()) {
    parts.push('');
    parts.push('');
  }

  parts.push(content.trim());

  return parts.join('\n');
}


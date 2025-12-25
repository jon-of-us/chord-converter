import { fileConfig, metadataFields } from './config';

export interface ChordFileMetadata {
  title: string;
  artist: string;
  key: string;
  info: string;
}

/**
 * Parse metadata from the beginning of a .chords file
 * Expected format:
 * Title: ...
 * Artist: ...
 * Key: ...
 * Info: ...
 */
export function parseMetadata(content: string): { metadata: ChordFileMetadata; contentWithoutMetadata: string } {
  const lines = content.split('\n');
  const metadata: ChordFileMetadata = {
    title: fileConfig.defaultTitle,
    artist: fileConfig.defaultArtist,
    key: fileConfig.defaultKey,
    info: fileConfig.defaultInfo,
  };

  let metadataEndIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Title:')) {
      metadata.title = line.substring(6).trim();
      metadataEndIndex = i + 1;
    } else if (line.startsWith('Artist:')) {
      metadata.artist = line.substring(7).trim();
      metadataEndIndex = i + 1;
    } else if (line.startsWith('Key:')) {
      metadata.key = line.substring(4).trim();
      metadataEndIndex = i + 1;
    } else if (line.startsWith('Info:')) {
      metadata.info = line.substring(5).trim();
      metadataEndIndex = i + 1;
    } else if (line !== '' && !line.startsWith('Title:') && !line.startsWith('Artist:') && !line.startsWith('Key:') && !line.startsWith('Info:')) {
      // Stop parsing when we hit content that's not metadata
      break;
    }
  }

  const contentWithoutMetadata = lines.slice(metadataEndIndex).join('\n').trim();

  return { metadata, contentWithoutMetadata };
}

/**
 * Serialize metadata and content back into a .chords file format
 */
export function serializeWithMetadata(metadata: ChordFileMetadata, content: string): string {
  const parts: string[] = [];

  if (metadata.title) {
    parts.push(`Title: ${metadata.title}`);
  }
  if (metadata.artist) {
    parts.push(`Artist: ${metadata.artist}`);
  }
  if (metadata.key) {
    parts.push(`Key: ${metadata.key}`);
  }
  if (metadata.info) {
    parts.push(`Info: ${metadata.info}`);
  }

  // Add empty line between metadata and content if there's content
  if (parts.length > 0 && content.trim()) {
    parts.push('');
  }

  parts.push(content.trim());

  return parts.join('\n');
}

/**
 * Ensure filename has .chords extension
 */
export function ensureChordsExtension(filename: string): string {
  if (filename.endsWith(fileConfig.extension)) {
    return filename;
  }
  // Remove any existing extension and add .chords
  const nameWithoutExt = filename.replace(/\.[^.]*$/, '');
  return `${nameWithoutExt}${fileConfig.extension}`;
}

/**
 * Check if a filename has .chords extension
 */
export function isChordsFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(fileConfig.extension);
}

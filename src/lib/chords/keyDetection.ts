/**
 * Key detection from chords using convolution
 * Analyzes all chords in a file and determines the most likely key
 */

import { parseChord } from './chordParser';

/**
 * Detect key from chords using convolution with Krumhansl-Schmuckler weights
 * This  algorithm computes the offset to key C major (4)
 * @param content - The full file content with chords
 * @returns Numeric key (0-11) or null if no chords found
 */
export function detectKeyFromChords(content: string): number | null {
  const lines = content.split('\n');
  const chords = [];
  
  // Extract all chords from the content, skipping metadata
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip metadata and section headers
    if (trimmed.startsWith('Title:') || 
        trimmed.startsWith('Artist:') ||
        trimmed.startsWith('Key:') ||
        trimmed.startsWith('Info:') ||
        trimmed.startsWith('[')) {
      continue;
    }
    
    // Split by whitespace and parse each word as a potential chord
    const words = line.split(/\s+/);
    for (const word of words) {
      const chord = parseChord(word);
      if (chord) {
        chords.push(chord);
      }
    }
  }
  
  // If no chords found, can't detect key
  if (chords.length === 0) return null;
  
  // Count note occurrences
  const noteCount = new Array(12).fill(0);
  
  for (const chord of chords) {
    // Add each note in the chord to the count
    for (const interval of chord.type.intervals) {
      const note = (chord.root + interval * 7) % 12;
      noteCount[note] += 1;
    }
    // Bass note gets double weight (more important for key detection)
    noteCount[(chord.root + chord.bass * 7) % 12] += 2;
  }
  
  // Krumhansl-Schmuckler weights for major keys
  // These weights represent how likely each scale degree is in a major key
  const weights = [10, 0, 4, 174, 265, 231, 139, 221, 180, 100, 6, 2];
  
  // Convolve: try each possible key offset and find the best match
  let maxScore = -Infinity;
  let bestOffset = 0;
  
  for (let offset = 0; offset < 12; offset++) {
    let score = 0;
    for (let i = 0; i < 12; i++) {
      score += noteCount[(i + offset) % 12] * weights[i];
    }
    if (score > maxScore) {
      maxScore = score;
      bestOffset = offset;
    }
  }
  
  return bestOffset;
}

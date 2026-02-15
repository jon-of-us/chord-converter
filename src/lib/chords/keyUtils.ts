/**
 * Key parsing and conversion utilities
 * Handles various key formats: note names (C, Am, D#m), formats (C Major, A minor), and numeric (1-12)
 */

/**
 * Map note names to their numeric values (0-11)
 * Matches the chord parser mapping from chordParser.ts
 * A=7, Bb=2, B=9, C=4, Db=11, D=6, Eb=1, E=8, F=3, Gb=10, G=5, Ab=0
 */
export const NOTE_TO_NUMBER = {
  'C': 4, 'c': 4,
  'C#': 11, 'c#': 11, 'Db': 11, 'db': 11,
  'D': 6, 'd': 6,
  'D#': 1, 'd#': 1, 'Eb': 1, 'eb': 1,
  'E': 8, 'e': 8,
  'F': 3, 'f': 3,
  'F#': 10, 'f#': 10, 'Gb': 10, 'gb': 10,
  'G': 5, 'g': 5,
  'G#': 0, 'g#': 0, 'Ab': 0, 'ab': 0,
  'A': 7, 'a': 7,
  'A#': 2, 'a#': 2, 'Bb': 2, 'bb': 2,
  'B': 9, 'b': 9,
};

/**
 * Map numeric values (0-11) to note names
 */
export const NUMBER_TO_NOTE = {
  0: 'Ab', 1: 'Eb', 2: 'Bb', 3: 'F', 4: 'C', 5: 'G',
  6: 'D', 7: 'A', 8: 'E', 9: 'B', 10: 'Gb', 11: 'Db'
};

/**
 * Parse a key string and return numeric representation (0-11)
 * Supports formats: "A", "Am", "A major", "A Major", "1", etc.
 * Numbers (1-12) represent major keys where 1=C, 2=C#, ..., 12=B
 * Returns null if key is invalid
 */
export function parseKeyString(keyStr: string): number | null {
  if (!keyStr || keyStr.trim() === '') return null;
  
  const key = keyStr.trim();
  
  // Check if it's already a number (0-11)
  const num = parseInt(key);
  if (!isNaN(num) && num >= 0 && num <= 11) {
    return num;
  }
  
  // Parse note name with optional modifier
  const lower = key.toLowerCase();
  
  // Check if it's minor (ends with 'm' or contains 'minor')
  const isMinor = lower.endsWith('m') || lower.includes('minor');
  
  // Extract the note part by removing all modifiers
  let notePart = key.replace(/\s*(major|minor|m|maj|min)\s*/gi, '').trim();
  
  // Look up the note
  const noteNum = NOTE_TO_NUMBER[notePart as keyof typeof NOTE_TO_NUMBER];
  if (noteNum === undefined) return null;
  
  // If minor, subtract 3 (relative major key)
  if (isMinor) {
    return (noteNum - 3 + 12) % 12;
  }
  
  return noteNum;
}



/**
 * Check if a key string is valid
 */
export function isValidKeyString(keyStr: string): boolean {
  return parseKeyString(keyStr) !== null;
}

/**
 * Key detection from chords using convolution
 * Analyzes all chords in a file and determines the most likely key
 */


// Krumhansl-Schmuckler weights for major keys
// These weights represent how likely each scale degree is in a major key
// const KRUMHANSL_SCHMUCKLER_WEIGHTS = [10.0, 0.0, 4.0, 174.0, 265.0, 231.0, 139.0, 221.0, 180.0, 100.0, 6.0, 2.0];
const KRUMHANSL_SCHMUCKLER_WEIGHTS = [0.0, 0.0, 0.0, 1.0, 1.8, 1.3, 1.0, 1.8, 1.0, 0.5, 0.0, 0.0]; // simplified weights for major keys
const MAJOR_WEIGHT = 0.5; // weight for major chords
const DIMINISHED_WEIGHT = 0.1; // weight for diminished chords


/**
 * Count note occurrences from chords with weighted importance
 * @param chords - Array of parsed chords
 * @returns Array of 12 note counts (one per chromatic note)
 */
function countNoteOccurrences(chords: any[]): number[] {
  const noteCount = new Array(12).fill(0.0);
  
  for (const chord of chords) {
    // Weight major and diminished chords less
    const isMajor = chord.type.intervals.slice(0, 3).toString() === '0,4,7';
    const isDiminished = chord.type.intervals.slice(0, 3).toString() === '0,3,6';

    const typeWeight = isMajor ? MAJOR_WEIGHT : isDiminished ? DIMINISHED_WEIGHT : 1.0;
    // Add each note in the chord to the count
    for (const interval of chord.type.intervals) {
      const note = (chord.root + interval * 7) % 12;
      noteCount[note] += typeWeight; // weight major chords slightly less, diminished even less
    }
    // root note gets double weight (more important for key detection)
    noteCount[chord.root] += 2 * typeWeight;
  }
  
  return noteCount;
}

/**
 * Find the best key offset using convolution with Krumhansl-Schmuckler weights
 * @param noteCount - Array of note occurrence counts
 * @returns Best offset value
 */
function findBestKeyOffset(noteCount: number[]): number {
  let maxScore = -Infinity;
  let bestOffset = 0;
  
  for (let offset = 0; offset < 12; offset++) {
    let score = 0;
    for (let i = 0; i < 12; i++) {
      score += noteCount[(i + offset) % 12] * KRUMHANSL_SCHMUCKLER_WEIGHTS[i];
    }
    console.log(`Key ${(offset+4) % 12}: score ${score.toFixed(2)}\n`);
    if (score > maxScore) {
      maxScore = score;
      bestOffset = offset;
    }
  }
  console.log(`note counts after shifting to C: ${noteCount.map((count, i) => `${count.toFixed(0)}`).join(' ')}\n`);
  console.log(`detected key: ${(bestOffset + 4) % 12}`);
  
  return bestOffset;
}

/**
 * This algorithm computes the offset to key C major (4)
 * @returns Numeric key (0-11) or 4 if no chords found
 */
export function detectKeyFromChords(chords: any[]): number {
  // If no chords found, can't detect key
  if (chords.length === 0) return 4;
  
  const noteCount = countNoteOccurrences(chords);
  const bestOffset = findBestKeyOffset(noteCount);
  
  return (bestOffset + 4) % 12; // Convert offset from C (4) to actual key
}

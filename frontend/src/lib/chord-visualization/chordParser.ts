import { CHORD_TYPES, type Chord, type ChordType } from './chordTypes';

const c1 = ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"];
const c2 = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
const enharmonics = ["Cb", "E#", "Fb", "B#"];

const old_chords = [...c1, ...c2, ...enharmonics];
const new_chords = [
  ...[7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5, 0],
  ...[7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5, 0],
  9,  // Cb -> B
  3,  // E# -> F
  8,  // Fb -> E
  4,  // B# -> C
];

const chord_table = old_chords
  .map((old, idx) => [old, new_chords[idx]] as [string, number])
  .sort((a, b) => b[0].length - a[0].length); // Sort by length descending

export function parseChord(str: string): Chord | null {
  const split = str.split('/');
  const chordStr = split[0];
  
  let root: number | undefined;
  let rest = '';
  
  for (const [old, newVal] of chord_table) {
    if (chordStr.length >= old.length && chordStr.substring(0, old.length) === old) {
      root = newVal;
      rest = chordStr.substring(old.length);
      break;
    }
  }
  
  if (root === undefined) return null;
  
  for (const chordType of CHORD_TYPES) {
    for (const alias of chordType.aliases) {
      if (rest === alias) {
        let bass = 0;
        
        if (split.length > 1) {
          const bassStr = split[1];
          for (const [old, newVal] of chord_table) {
            if (bassStr === old) {
              bass = newVal;
              bass = ((bass - root) * 7) % 12;
              break;
            }
          }
        }
        
        return {
          root,
          type: chordType,
          bass
        };
      }
    }
  }
  
  return null;
}

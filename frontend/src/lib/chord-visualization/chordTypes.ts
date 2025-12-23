import chordsData from './chords.json' with { type: 'json' };

export interface ChordType {
  name: string;
  aliases: string[];
  intervals: number[];
  coords?: [number, number][];
  bass_coord?: [number, number];
}

export interface Chord {
  root: number;
  type: ChordType;
  bass: number;
}

interface ChordData {
  name: string;
  aliases: string[];
  intervals: number[];
  coords?: number[][];
  bass_coord?: [number, number];
}

// Load chord types from JSON
export const CHORD_TYPES: ChordType[] = (chordsData.chords as ChordData[]).map(chord => ({
  name: chord.name,
  aliases: chord.aliases,
  intervals: chord.intervals,
  ...(chord.coords && { coords: chord.coords as [number, number][] }),
  ...(chord.bass_coord && { bass_coord: chord.bass_coord })
}));

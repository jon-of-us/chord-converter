import type { Chord } from './chordTypes';

// Configuration constants from Python config.py
const TONIC_RAD = 90;
const BASS_INNER_RAD = TONIC_RAD * 0.3;
const PADDING = 5 + Math.max(70, TONIC_RAD);
const LINE_WIDTH = 50;
const HORIZONTAL_DISTANCE = 200;
const VERTICAL_DISTANCE = HORIZONTAL_DISTANCE * Math.sqrt(3) / 2;
const ROW_SHIFT = -HORIZONTAL_DISTANCE / 2;
const TONIC_POINT_INDICES: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]];

// Color schemes
const LIGHT_MODE = {
  CHORD_COLOR: "#333333",
  CHORD_RAD: 70,
  TONIC_COLOR: "#BDBDBD",
  BASS_INNER_COLOR: "white"
};

const DARK_MODE = {
  CHORD_COLOR: "#d7d7d7ff",
  CHORD_RAD: 70,
  TONIC_COLOR: "#646464ff",
  BASS_INNER_COLOR: "#1e1e1e"
};

type Point = [number, number];

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function add(tup1: Point, tup2: Point): Point {
  return [tup1[0] + tup2[0], tup1[1] + tup2[1]];
}

function intervalToIndex(interval: number): Point {
  const offset = 3;
  const qi = mod(7 * interval + offset, 12) - offset;
  const row = Math.floor(qi / 3);
  const col = mod(qi, 3);
  return [row, col];
}

function bassToIndex(bass: number, chordIndices: Point[]): Point {
  const idx = intervalToIndex(bass);
  const octaveShifts: Point[] = [[0, 0], [-1, 3], [1, -3]];
  let bestIdx: Point | null = null;
  let bestDist = Infinity;
  
  for (const octaveShift of octaveShifts) {
    const shiftedIdx = add(idx, octaveShift);
    for (const chordIdx of chordIndices) {
      const dist = Math.sqrt(
        Math.pow(shiftedIdx[0] - chordIdx[0], 2) +
        Math.pow(shiftedIdx[1] - chordIdx[1], 2)
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = shiftedIdx;
      }
    }
  }
  
  return bestIdx!;
}

export function generateChordSVG(chord: Chord, theme: 'dark' | 'light' = 'dark'): string {
  // Select color scheme based on theme
  const colors = theme === 'light' ? LIGHT_MODE : DARK_MODE;
  const CHORD_RAD = colors.CHORD_RAD;
  const CHORD_COLOR = colors.CHORD_COLOR;
  const TONIC_COLOR = colors.TONIC_COLOR;
  const BASS_INNER_COLOR = colors.BASS_INNER_COLOR;
  
  // Create grid coordinates
  const rowCoords: number[][] = [];
  const colCoords: number[][] = [];
  
  for (let row = 0; row < 30; row++) {
    rowCoords[row] = [];
    colCoords[row] = [];
    for (let col = 0; col < 30; col++) {
      rowCoords[row][col] = VERTICAL_DISTANCE * row;
      colCoords[row][col] = HORIZONTAL_DISTANCE * col + ROW_SHIFT * row;
    }
  }
  
  // Determine which points to draw
  const chordIntervals = chord.type.intervals;
  const providedCoords = chord.type.coords;
  
  let chordPointIndices: Point[] = providedCoords
    ? providedCoords.map(c => [c[0], c[1]] as Point)
    : chordIntervals.map(intervalToIndex);
  
  const providedBassIndex = chord.type.bass_coord;
  let bassIndex: Point[] = [
    providedBassIndex 
      ? [providedBassIndex[0], providedBassIndex[1]] as Point
      : bassToIndex(chord.bass, chordPointIndices)
  ];
  
  const rootIndex = intervalToIndex(chord.root * 7);
  chordPointIndices = chordPointIndices.map(idx => add(idx, rootIndex));
  bassIndex = bassIndex.map(idx => add(idx, rootIndex));
  
  // Determine octave of points
  const octaveShifts: Point[] = [[0, 0], [-1, 3], [1, -3]];
  const rewardRoot: Point = [1, 2];
  const rewards = [
    [0.0, 0.0, 0.2, 0.2, 0.2, 0.3, 0.0, 0.0],
    [0.3, 0.5, 1.0, 1.0, 1.0, 0.8, 0.0, 0.0],
    [0.0, 0.5, 1.0, 1.0, 1.0, 0.7, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ];
  
  let bestOctave: Point | null = null;
  let bestReward = -1;
  
  for (const octaveShift of octaveShifts) {
    const shiftedCoords = chordPointIndices.map(idx => 
      add(add(idx, octaveShift), rewardRoot)
    );
    const reward = shiftedCoords.reduce((sum, [r, c]) => {
      if (r >= 0 && r < rewards.length && c >= 0 && c < rewards[0].length) {
        return sum + rewards[r][c];
      }
      return sum;
    }, 0);
    
    if (reward > bestReward) {
      bestReward = reward;
      bestOctave = octaveShift;
    }
  }
  
  // Apply best octave shift
  if (bestOctave) {
    chordPointIndices = chordPointIndices.map(idx => add(idx, bestOctave!));
    bassIndex = bassIndex.map(idx => add(idx, bestOctave!));
  }
  
  // normalize all point indices to start from (0,0) to ensure no negative indices
  const tonicPointIndices = [...TONIC_POINT_INDICES];
  const drawnPoints = [...bassIndex, ...chordPointIndices, ...tonicPointIndices];
  
  const minRowIdx = Math.min(...drawnPoints.map(p => p[0]));
  const minColIdx = Math.min(...drawnPoints.map(p => p[1]));
  
  const shiftAll = (points: Point[]): Point[] => 
    points.map(p => add(p, [-minRowIdx, -minColIdx]));
  
  const shiftedBass = shiftAll(bassIndex);
  const shiftedChord = shiftAll(chordPointIndices);
  const shiftedTonic = shiftAll(tonicPointIndices);
  const allShifted = [...shiftedBass, ...shiftedChord, ...shiftedTonic];
  
  // Shift coordinates to fit drawn points
  const usedColCoords = allShifted.map(([r, c]) => colCoords[r][c]);
  const minCol = Math.min(...usedColCoords);
  const maxCol = Math.max(...usedColCoords);
  
  const width = maxCol - minCol + 2 * PADDING;
  const height = VERTICAL_DISTANCE * 5 + 2 * PADDING;
  
  // correct for normalization shift
  const adjustedRowCoords = rowCoords.map(row => 
    row.map(val => val - (-minRowIdx - 2) * VERTICAL_DISTANCE + PADDING)
  );
  const adjustedColCoords = colCoords.map(row => 
    row.map(val => val - minCol + PADDING)
  );
  
  // Generate SVG content
  let svgContent = `<svg class="chord-icon" viewBox="0 0 ${width} ${height}" data-w="${width}" data-h="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  const drawCircle = (point: Point, rad: number, color: string): string => {
    const cx = adjustedColCoords[point[0]][point[1]];
    const cy = adjustedRowCoords[point[0]][point[1]];
    return `  <circle cx="${cx}" cy="${cy}" r="${rad}" fill="${color}" />\n`;
  };
  
  // Draw tonic points
  for (const point of shiftedTonic) {
    svgContent += drawCircle(point, TONIC_RAD, TONIC_COLOR);
  }
  
  // Draw lines between chord points
  for (let i = 0; i < shiftedChord.length; i++) {
    const [r1, c1] = shiftedChord[i];
    const x1 = adjustedColCoords[r1][c1];
    const y1 = adjustedRowCoords[r1][c1];
    
    for (let j = i + 1; j < shiftedChord.length; j++) {
      const [r2, c2] = shiftedChord[j];
      const x2 = adjustedColCoords[r2][c2];
      const y2 = adjustedRowCoords[r2][c2];
      const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      
      if (dist < 1.5 * HORIZONTAL_DISTANCE) {
        svgContent += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CHORD_COLOR}" stroke-width="${LINE_WIDTH}" />\n`;
      }
    }
  }
  
  // Draw chord points
  for (const point of shiftedChord) {
    svgContent += drawCircle(point, CHORD_RAD, CHORD_COLOR);
  }
  
  // Draw bass (only if it's not the leftmost point)
  for (const bassIdx of shiftedBass) {
    const bassCol = adjustedColCoords[bassIdx[0]][bassIdx[1]];
    const minChordCol = Math.min(...shiftedChord.map(([r, c]) => adjustedColCoords[r][c]));
    
    if (bassCol !== minChordCol) {
      svgContent += drawCircle(bassIdx, CHORD_RAD, CHORD_COLOR);
      svgContent += drawCircle(bassIdx, BASS_INNER_RAD, BASS_INNER_COLOR);
    }
  }
  
  svgContent += "</svg>";
  return svgContent;
}

export function generateChordShapeSVG(chord: Chord, theme: 'dark' | 'light' = 'dark'): string {
  // Select color scheme based on theme
  const colors = theme === 'light' ? LIGHT_MODE : DARK_MODE;
  const CHORD_RAD = colors.CHORD_RAD;
  const CHORD_COLOR = colors.CHORD_COLOR;
  const BASS_INNER_COLOR = colors.BASS_INNER_COLOR;
  
  // Create grid coordinates
  const rowCoords: number[][] = [];
  const colCoords: number[][] = [];
  
  for (let row = 0; row < 30; row++) {
    rowCoords[row] = [];
    colCoords[row] = [];
    for (let col = 0; col < 30; col++) {
      rowCoords[row][col] = VERTICAL_DISTANCE * row;
      colCoords[row][col] = HORIZONTAL_DISTANCE * col + ROW_SHIFT * row;
    }
  }
  
  // Determine which points to draw
  const chordIntervals = chord.type.intervals;
  const providedCoords = chord.type.coords;
  
  let chordPointIndices: Point[] = providedCoords
    ? providedCoords.map(c => [c[0], c[1]] as Point)
    : chordIntervals.map(intervalToIndex);
  
  const providedBassIndex = chord.type.bass_coord;
  let bassIndex: Point[] = [
    providedBassIndex 
      ? [providedBassIndex[0], providedBassIndex[1]] as Point
      : bassToIndex(chord.bass, chordPointIndices)
  ];
  
  
  // Determine octave of points
  const shifts: Point[] = [];
  for (let vert = -4; vert <= 4; vert++) {
      shifts.push([vert, 2]);
  }
  const rewardRoot: Point = [1, 2];
  const rewards = [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    [1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ];
  // neighbors for each point
  const n_neighbors = chordPointIndices.map(
    p1 => chordPointIndices.reduce((count, p2) => {
      if (p1 === p2) return count;
      if (p1[0] === p2[0] && Math.abs(p1[1] - p2[1]) === 1) return count + 1;
      if (p1[0] + 1 === p2[0] && (p1[1] === p2[1] || p1[1] + 1 === p2[1])) return count + 1;
      if (p1[0] - 1 === p2[0] && (p1[1] === p2[1] || p1[1] - 1 === p2[1])) return count + 1;
      return count;
    }, 0)
  );
  
  let bestPositionShift: Point = [0, 0];
  let bestReward = -1;
  
  for (const shift of shifts) {
    const shiftedCoords = chordPointIndices.map(idx => 
      add(add(idx, shift), rewardRoot)
    );
    const reward = shiftedCoords.reduce((sum, [r, c], idx) => {
      if (r >= 0 && r < rewards.length && c >= 0 && c < rewards[0].length) {
        return sum + rewards[r][c] * n_neighbors[idx];
      }
      return sum;
    }, 0);
    
    if (reward > bestReward) {
      bestReward = reward;
      bestPositionShift = shift;
    }
  }
  
  
  if (bestPositionShift) {
    chordPointIndices = chordPointIndices.map(idx => add(idx, bestPositionShift!));
    bassIndex = bassIndex.map(idx => add(idx, bestPositionShift!));
  }
  
  // normalize all point indices to start from (0,0) to ensure no negative coords
  const drawnPoints = [...bassIndex, ...chordPointIndices];
  
  const minRowIdx = Math.min(...drawnPoints.map(p => p[0]));
  const minColIdx = Math.min(...drawnPoints.map(p => p[1]));
  
  const shiftAll = (points: Point[]): Point[] => 
    points.map(p => add(p, [-minRowIdx, -minColIdx]));
  
  const shiftedBass = shiftAll(bassIndex);
  const shiftedChord = shiftAll(chordPointIndices);
  const allShifted = [...shiftedBass, ...shiftedChord];
  
  // Shift coordinates to fit drawn points
  const usedColCoords = allShifted.map(([r, c]) => colCoords[r][c]);
  const minCol = Math.min(...usedColCoords);
  const maxCol = Math.max(...usedColCoords);
  
  const width = maxCol - minCol + 2 * PADDING;
  const height = VERTICAL_DISTANCE * 5 + 2 * PADDING;
  
  // correct for normalization shift
  const adjustedRowCoords = rowCoords.map(row => 
    row.map(val => val - (-minRowIdx - 2) * VERTICAL_DISTANCE + PADDING)
  );
  const adjustedColCoords = colCoords.map(row => 
    row.map(val => val - minCol + PADDING)
  );
  
  // Generate SVG content
  let svgContent = `<svg class="chord-icon" viewBox="0 0 ${width} ${height}" data-w="${width}" data-h="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  const drawCircle = (point: Point, rad: number, color: string): string => {
    const cx = adjustedColCoords[point[0]][point[1]];
    const cy = adjustedRowCoords[point[0]][point[1]];
    return `  <circle cx="${cx}" cy="${cy}" r="${rad}" fill="${color}" />\n`;
  };
  
  // Draw lines between chord points
  for (let i = 0; i < shiftedChord.length; i++) {
    const [r1, c1] = shiftedChord[i];
    const x1 = adjustedColCoords[r1][c1];
    const y1 = adjustedRowCoords[r1][c1];
    
    for (let j = i + 1; j < shiftedChord.length; j++) {
      const [r2, c2] = shiftedChord[j];
      const x2 = adjustedColCoords[r2][c2];
      const y2 = adjustedRowCoords[r2][c2];
      const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      
      if (dist < 1.5 * HORIZONTAL_DISTANCE) {
        svgContent += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CHORD_COLOR}" stroke-width="${LINE_WIDTH}" />\n`;
      }
    }
  }
  
  // Draw chord points
  for (const point of shiftedChord) {
    svgContent += drawCircle(point, CHORD_RAD, CHORD_COLOR);
  }
  
  // Draw bass (only if it's not the leftmost point)
  for (const bassIdx of shiftedBass) {
    const bassCol = adjustedColCoords[bassIdx[0]][bassIdx[1]];
    const minChordCol = Math.min(...shiftedChord.map(([r, c]) => adjustedColCoords[r][c]));
    
    if (bassCol !== minChordCol) {
      svgContent += drawCircle(bassIdx, CHORD_RAD, CHORD_COLOR);
      svgContent += drawCircle(bassIdx, BASS_INNER_RAD, BASS_INNER_COLOR);
    }
  }
  
  svgContent += "</svg>";
  return svgContent;
}

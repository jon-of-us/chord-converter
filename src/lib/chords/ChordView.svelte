<script lang="ts">
  import * as ChordParser from './chordParser';
  import { generateChordSVG } from './chordToSVG';
  import type { Chord } from './chordTypes';
  import { onMount } from 'svelte';
  import { editorConfig } from '../config';
  import * as KeyDetection from './keyDetection';

  const CHORD_ICON_GAP = 10; // px minimal horizontal gap between consecutive chord icons

  interface ChordOrWord {
    pos: [number, number]; // [line index, position in line]
    content: Chord | string;
    isChord: boolean;
  }

  let { content = '', zoomLevel = 100, isAutoscrolling = false, autoscrollSpeed = 1, theme = 'dark' }: 
    { content: string; zoomLevel?: number; isAutoscrolling?: boolean; autoscrollSpeed?: number; theme?: 'dark' | 'light' } = $props();
  let viewContainer: HTMLDivElement;
  let scrollOffset = $state(0);

  function lineType(line: string): 'empty' | 'subheading' | 'chords' | 'lyrics' {
    const s = line.trim();
    if (s.length === 0) return 'empty';
    if (s.startsWith('[')) return 'subheading';

    const split = line.split(' ').filter(w => w !== '');
    if (split.length === 0) return 'empty';

    const wordsNoSlash = split.map(w => w.split('/')[0]);
    const nWords = wordsNoSlash.length;
    const isChord = wordsNoSlash.map(w => ChordParser.parseChord(w) !== null || w === '|');
    const nChords = isChord.filter(Boolean).length;

    if (nChords / Math.max(1, nWords) > 0.35) return 'chords';
    return 'lyrics';
  }

  function transposeToC(chordsOrWords: ChordOrWord[]): ChordOrWord[] {
    // Extract just the chords for calculation
    const chordsOnly = chordsOrWords
      .filter(cow => cow.isChord)
      .map(cow => cow.content as Chord);

    // Calculate the offset needed to transpose to C
    const offsetToC = KeyDetection.calculateTransposeToCOffset(chordsOnly);

    // Apply the transpose offset to all chords
    for (const cow of chordsOrWords) {
      if (!cow.isChord) continue;
      const chord = cow.content as Chord;
      chord.root = (chord.root - offsetToC + 12) % 12;
    }

    return chordsOrWords;
  }

  interface ProcessedLine {
    type: string;
    content: string;
    lineIdx: number;
    chords?: Array<{ 
      pos: number; 
      svg: string; 
      word: string;
      markerId: string;
    }>;
    maxPos?: number;
  }

  function processContent(text: string, themeMode: 'dark' | 'light'): ProcessedLine[] {
    const lines = text.split('\n').map(ln => ln.trimEnd());
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    const lineTypes = nonEmptyLines.map(lineType);

    const chordsOrWords: ChordOrWord[] = [];
    const chordsInLine: number[][] = nonEmptyLines.map(() => []);

    for (let i = 0; i < nonEmptyLines.length; i++) {
      const line = nonEmptyLines[i];
      const ltype = lineTypes[i];

      if (ltype !== 'chords') continue;

      const split = line.split(' ');
      let idxInLine = 0;

      for (const tok of split) {
        if (tok === '') {
          idxInLine += 1;
          continue;
        }

        const parsed = ChordParser.parseChord(tok);
        const content = parsed || tok;

        chordsInLine[i].push(chordsOrWords.length);
        chordsOrWords.push({
          pos: [i, idxInLine],
          content,
          isChord: parsed !== null,
        });

        idxInLine += tok.length + 1;
      }
    }

    const transposedChords = transposeToC(chordsOrWords);
    const svgCache = new Map<string, string>();

    // Build HTML representation
    const result: ProcessedLine[] = [];

    for (let i = 0; i < nonEmptyLines.length; i++) {
      const line = nonEmptyLines[i];
      const ltype = lineTypes[i];

      if (i === 0) {
        // First non-empty line is the title
        let titleContent = line;
        // Remove "Title: " prefix if it exists (case-insensitive)
        if (titleContent.toLowerCase().startsWith('title:')) {
          titleContent = titleContent.substring(6).trim();
        }
        // Convert to uppercase
        titleContent = titleContent.toUpperCase();
        result.push({ type: 'heading', content: titleContent, lineIdx: i });
      } else if (ltype === 'subheading') {
        result.push({ type: 'subheading', content: line, lineIdx: i });
      } else if (ltype === 'lyrics') {
        result.push({ type: 'lyrics', content: line, lineIdx: i });
      } else if (ltype === 'chords') {
        const cows = chordsInLine[i].map(idx => transposedChords[idx]);
        
        // Find max position
        let maxPos = 0;
        for (const cow of cows) {
          maxPos = Math.max(maxPos, cow.pos[1]);
        }

        const chordData = cows.map(cow => {
          const markerId = `mk-${i}-${cow.pos[1]}`;
          
          if (cow.isChord) {
            const chord = cow.content as Chord;
            const key = `${chord.root}-${chord.type.intervals.join(',')}-${chord.bass}-${themeMode}`;
            
            if (!svgCache.has(key)) {
              const adjustedChord = { ...chord, root: chord.root - 3 }; // transpose to C major for display
              svgCache.set(key, generateChordSVG(adjustedChord, themeMode));
            }
            
            return {
              pos: cow.pos[1],
              svg: svgCache.get(key)!,
              word: '',
              markerId,
            };
          } else {
            // For words, show full word
            const wordStr = cow.content as string;
            return {
              pos: cow.pos[1],
              svg: '',
              word: wordStr,
              markerId,
            };
          }
        });

        result.push({ 
          type: 'chords', 
          content: line, 
          lineIdx: i,
          chords: chordData,
          maxPos: maxPos + 2,
        });
      }
    }

    return result;
  }

  function alignChordIcons() {
    if (!viewContainer) return;
    
    const lines = viewContainer.querySelectorAll('.chord-line-wrapper');
    
    lines.forEach(line => {
      const containerRect = line.getBoundingClientRect();
      const markers = Array.from(line.querySelectorAll('.chord-markers .chord-marker'));
      
      // Build array of items (both chords and words) with their natural positions
      const items: Array<{
        type: 'chord' | 'word';
        element: HTMLElement;
        naturalLeft: number;
      }> = [];
      
      markers.forEach(m => {
        const svg = m.querySelector('svg.chord-icon') as HTMLElement;
        const markerId = m.id;
        const wordEl = line.querySelector(`.word-chord[data-marker='${markerId}']`) as HTMLElement;
        
        if (svg) {
          items.push({
            type: 'chord',
            element: svg,
            naturalLeft: m.getBoundingClientRect().left - containerRect.left
          });
        }
        if (wordEl) {
          items.push({
            type: 'word',
            element: wordEl,
            naturalLeft: m.getBoundingClientRect().left - containerRect.left
          });
        }
      });
      
      // Sort by their natural marker position from left to right
      items.sort((a, b) => a.naturalLeft - b.naturalLeft);
      
      let lastRight = -Infinity;
      items.forEach(item => {
        const element = item.element;
        // Reset any previous shift so measurement is consistent
        if (item.type === 'chord') {
          element.style.transform = 'translateX(0px)';
        } else {
          element.style.transform = `translate(${item.naturalLeft}px, 0)`;
        }
        
        const rect = element.getBoundingClientRect();
        const width = rect.width;
        let desiredLeft = item.naturalLeft;
        
        if (item.naturalLeft < lastRight + CHORD_ICON_GAP) {
          desiredLeft = lastRight + CHORD_ICON_GAP;
        }
        
        const shift = desiredLeft - item.naturalLeft;
        if (item.type === 'chord') {
          if (shift !== 0) {
            element.style.transform = `translateX(${shift}px)`;
          }
        } else {
          element.style.transform = `translate(${desiredLeft}px, 0)`;
        }
        
        lastRight = desiredLeft + width;
      });
    });
  }

  let processedLines = $derived(processContent(content, theme));

  onMount(() => {
    alignChordIcons();
    window.addEventListener('resize', alignChordIcons);
    
    return () => {
      window.removeEventListener('resize', alignChordIcons);
    };
  });

  $effect(() => {
    // Re-align when content or zoom changes
    processedLines;
    zoomLevel;
    setTimeout(alignChordIcons, 0);
  });

  let animationFrameId: number | null = null;
  let scrollAccumulator = 0;

  $effect(() => {
    // Autoscroll effect
    if (!isAutoscrolling || !viewContainer) {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      return;
    }

    scrollAccumulator = 0; // Reset accumulator when starting
    const scroll = () => {
      if (!isAutoscrolling || !viewContainer) return;
      
      // Convert speed multiplier to pixels per frame (at 60fps)
      const pixelsPerFrame = (autoscrollSpeed * editorConfig.autoscrollPixelsPerSecond) / 60;
      scrollAccumulator += pixelsPerFrame;
      
      // Only apply integer pixels to scrollTop
      const pixelsToScroll = Math.floor(scrollAccumulator);
      if (pixelsToScroll > 0) {
        viewContainer.scrollTop += pixelsToScroll;
        scrollAccumulator -= pixelsToScroll;
      }
      
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };
  });
</script>

<div class="chord-view" bind:this={viewContainer} style="font-size: {zoomLevel}%; background-color: {theme === 'light' ? '#ffffff' : '#1e1e1e'}; color: {theme === 'light' ? '#333333' : '#e0e0e0'};">
  {#each processedLines as line}
    {#if line.type === 'heading'}
      <div class="heading">{line.content}</div>
    {:else if line.type === 'subheading'}
      <div class="subheading">{line.content}</div>
    {:else if line.type === 'lyrics'}
      <pre class="lyrics">{line.content}</pre>
    {:else if line.type === 'chords'}
      <div class="chord-line-wrapper">
        <pre class="lyrics chord-markers">{#each Array(line.maxPos).fill(' ') as char, idx}{#if line.chords?.some(c => c.pos === idx)}{#each line.chords.filter(c => c.pos === idx) as chord}<span class="marker chord-marker" id={chord.markerId}>{#if chord.svg}{@html chord.svg}{/if}</span>{/each}{/if}{char}{/each}</pre>
        {#each line.chords?.filter(c => c.word) ?? [] as chord}
          <pre class="word-chord" data-marker={chord.markerId}>{chord.word}</pre>
        {/each}
      </div>
    {/if}
  {/each}
</div>

<style>
  .chord-view {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    line-height: 1.4;
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }

  pre {
    margin: 0.01rem;
    white-space: pre;
  }

  .heading {
    font-weight: 700;
    padding-top: 1rem;
    padding-bottom: 0.5rem;
    font-size: 1.5rem;
  }

  .subheading {
    font-weight: 700;
    padding-top: 1rem;
  }

  .chord-line-wrapper {
    position: relative;
    margin: 0;
    padding: 0;
  }

  .chord-line-wrapper .lyrics {
    position: relative;
    z-index: 1;
  }

  .marker {
    position: relative;
    display: inline-block;
    width: 0;
    height: 0;
    overflow: visible;
  }

  .marker :global(svg.chord-icon) {
    position: absolute;
    left: 0;
    bottom: -1.4em;
    height: 3.2em;
    overflow: visible;
  }

  .word-chord {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
    padding: 0;
    font-weight: 600;
    pointer-events: none;
    white-space: pre;
  }

  .chord-markers {
    position: relative;
  }
</style>

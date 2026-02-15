<script lang="ts">
    import { generateChordSVG, generateChordShapeSVG } from "./chordToSVG";
    import type { Chord } from "./chordTypes";
    import { onMount } from "svelte";
    import { editorConfig } from "../config";
    import * as KeyDetection from "./keyDetection";
    import type { ChordFile } from "../models/ChordFile";
    import * as chordFileService from "../services/chordFileService";
    import { editorStore } from "../stores/editorStore";
    import { themeStore } from "../stores/themeStore";

    const CHORD_ICON_GAP = 8; // px minimal horizontal gap between consecutive chord icons

    // Derive all data from stores
    let editedContent = $derived($editorStore.editedContent);
    let viewMode = $derived($editorStore.viewMode);
    let zoomLevel = $derived($editorStore.zoomLevel);
    let isAutoscrolling = $derived($editorStore.isAutoscrolling);
    let autoscrollSpeed = $derived($editorStore.autoscrollSpeed);
    let keyNumber = $derived($editorStore.keyNumber);
    let theme = $derived($themeStore);
    let showRootNumbers = $derived(viewMode === 'chords');
    
    // Parse chordFile from content
    let chordFile = $derived(chordFileService.parseChordFile(editedContent));
    
    let viewContainer: HTMLDivElement;

    function transposeChordToC(chord: Chord, offsetToC: number): Chord {
        return {
            ...chord,
            root: (chord.root - offsetToC + 12) % 12,
        };
    }

    interface ProcessedLine {
        type: string;
        content: string;
        chords?: Array<{
            pos: number;
            svg: string;
            word: string;
            markerId: string;
            rootNumber?: number;
        }>;
        maxPos?: number;
    }

    function processChordFile(
        chordFile: ChordFile,
        themeMode: "dark" | "light",
    ): ProcessedLine[] {

        // Calculate offset to transpose to C for visualization
        const offsetToC = KeyDetection.calculateTransposeToCOffset(chordFile.allChords);
        const svgCache = new Map<string, string>();

        const result: ProcessedLine[] = [];

        // Add title as heading
        let titleContent = chordFile.metadata.title;
        if (titleContent.toLowerCase().startsWith("title:")) {
            titleContent = titleContent.substring(6).trim();
        }
        titleContent = titleContent.toUpperCase();
        result.push({
            type: "heading",
            content: titleContent,
        });

        // Add blank line after title
        result.push({ type: "empty", content: "" });
        result.push({ type: "empty", content: "" });

        // Process each line
        for (let lineIdx = 0; lineIdx < chordFile.lines.length; lineIdx++) {
            const line = chordFile.lines[lineIdx];

            if (line.type === 'empty') {
                result.push({ type: "empty", content: line.content });
            } else if (line.type === 'heading') {
                // Skip - already added title above
                continue;
            } else if (line.type === 'subheading') {
                result.push({ type: "subheading", content: line.content });
            } else if (line.type === 'lyrics') {
                result.push({ type: "lyrics", content: line.content });
            } else if (line.type === 'chords' && line.chordsOrWords) {
                // Transpose all chords to C for visualization
                const transposedChordsOrWords = line.chordsOrWords.map(cow => {
                    if (cow.isChord) {
                        return {
                            ...cow,
                            content: transposeChordToC(cow.content as Chord, offsetToC),
                        };
                    }
                    return cow;
                });

                // Find max position
                let maxPos = 0;
                for (const cow of transposedChordsOrWords) {
                    maxPos = Math.max(maxPos, cow.position);
                }

                const chordData = transposedChordsOrWords.map((cow) => {
                    const markerId = `mk-${lineIdx}-${cow.position}`;

                    if (cow.isChord) {
                        const chord = cow.content as Chord;
                        const cachePrefix = showRootNumbers ? 'simplified' : 'full';
                        const key = `${cachePrefix}-${chord.root}-${chord.type.intervals.join(",")}-${chord.bass}-${themeMode}`;

                        if (!svgCache.has(key)) {
                            const adjustedChord = {
                                ...chord,
                                root: chord.root - 3,
                            }; // transpose to C major for display

                            // Use simplified SVG for structure mode, full SVG for chords mode
                            const svgGenerator = showRootNumbers ? generateChordShapeSVG : generateChordSVG;
                            svgCache.set(
                                key,
                                svgGenerator(adjustedChord, themeMode),
                            );
                        }

                        return {
                            pos: cow.position,
                            svg: svgCache.get(key)!,
                            word: "",
                            markerId,
                            rootNumber: chord.root, // Store the actual root number (transposed to current key)
                        };
                    } else {
                        // For words, show full word
                        const wordStr = cow.content as string;
                        return {
                            pos: cow.position,
                            svg: "",
                            word: wordStr,
                            markerId,
                            rootNumber: undefined,
                        };
                    }
                });

                result.push({
                    type: "chords",
                    content: line.content,
                    chords: chordData,
                    maxPos: maxPos + 2,
                });
            }
        }

        return result;
    }

    function alignChordIcons() {
        if (!viewContainer) return;

        const lines = viewContainer.querySelectorAll(".chord-line-wrapper");

        lines.forEach((line) => {
            const containerRect = line.getBoundingClientRect();
            const markers = Array.from(
                line.querySelectorAll(".chord-markers .chord-marker"),
            );

            // Build array of items (both chords and words) with their natural positions
            const items: Array<{
                type: "chord" | "word";
                element: HTMLElement;
                naturalLeft: number;
            }> = [];

            markers.forEach((m) => {
                const containers = m.querySelectorAll(
                    ".chord-container",
                ) as NodeListOf<HTMLElement>;
                const markerId = m.id;

                containers.forEach((container) => {
                    const isWord = container.classList.contains('word-container');
                    items.push({
                        type: isWord ? "word" : "chord",
                        element: container,
                        naturalLeft:
                            m.getBoundingClientRect().left - containerRect.left,
                    });
                });
            });

            // Sort by their natural marker position from left to right
            items.sort((a, b) => a.naturalLeft - b.naturalLeft);

            let lastRight = -Infinity;
            items.forEach((item) => {
                const element = item.element;
                // Reset any previous shift so measurement is consistent
                element.style.transform = "translateX(0px)";

                const rect = element.getBoundingClientRect();
                const width = rect.width;
                let desiredLeft = item.naturalLeft;

                if (item.naturalLeft < lastRight + CHORD_ICON_GAP) {
                    desiredLeft = lastRight + CHORD_ICON_GAP;
                }

                const shift = desiredLeft - item.naturalLeft;
                if (shift !== 0) {
                    element.style.transform = `translateX(${shift}px)`;
                }

                lastRight = desiredLeft + width;
            });
        });
    }

    let processedLines = $derived(processChordFile(chordFile, theme));

    onMount(() => {
        alignChordIcons();
        window.addEventListener("resize", alignChordIcons);

        return () => {
            window.removeEventListener("resize", alignChordIcons);
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
            // Scale with zoom level - higher zoom = faster scroll
            const zoomMultiplier = zoomLevel / 100;
            const pixelsPerFrame =
                (autoscrollSpeed * editorConfig.autoscrollPixelsPerSecond * zoomMultiplier) / 60;
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

<div
    class="chord-view"
    bind:this={viewContainer}
    style="font-size: {zoomLevel}%; background-color: {theme === 'light'
        ? '#ffffff'
        : '#1e1e1e'}; color: {theme === 'light' ? '#333333' : '#e0e0e0'};"
>
    {#each processedLines as line, idx}
        {#if line.type === "heading"}
            <pre class="lyrics heading">{line.content}</pre>
            {#if chordFile.metadata.artist}
                <pre class="lyrics">Artist: {chordFile.metadata.artist}</pre>
            {/if}
            <pre class="lyrics">Key: {keyNumber}</pre>
            {#if chordFile.metadata.info}
                <pre class="lyrics">Info: {chordFile.metadata.info}</pre>
            {/if}
        {:else if line.type === "empty"}
            <pre class="lyrics"></pre>
        {:else if line.type === "subheading"}
            <div class="subheading">{line.content}</div>
        {:else if line.type === "lyrics"}
            <pre class="lyrics">{line.content}</pre>
        {:else if line.type === "chords"}
            <div class="chord-line-wrapper">
                <pre
                    class="lyrics chord-markers">{#each Array(line.maxPos).fill(" ") as char, idx}{#if line.chords?.some((c) => c.pos === idx)}{#each line.chords.filter((c) => c.pos === idx) as chord}<span
                                    class="marker chord-marker"
                                    id={chord.markerId}
                                    >{#if chord.svg}<div
                                            class="chord-container">{#if showRootNumbers && chord.rootNumber !== undefined}<span
                                                    class="root-number"
                                                    >{(chord.rootNumber + keyNumber + 8 ) % 12}</span
                                            >{/if}{@html chord.svg}</div>{:else if chord.word}<div
                                            class="chord-container word-container"
                                            data-marker={chord.markerId}
                                        ><span class="chord-word">{chord.word}</span></div>{/if}</span
                                >{/each}{/if}{char}{/each}</pre>
            </div>
        {/if}
    {/each}
</div>

<style>
    .chord-view {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        line-height: 1.4;
        padding: 2rem 2rem 2rem 3rem;
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
        font-size: 1.5em;
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

    .chord-container {
        position: absolute;
        left: 0;
        bottom: -1.4em;
        display: flex;
        align-items: center;
        gap: 0.3em;
    }

    .word-container {
        /* Words use same positioning as chords but appear inline */
        bottom: -0.4em !important;
        gap: 0;
    }

    .chord-container :global(svg.chord-icon) {
        height: 3.2em;
        overflow: visible;
    }
    
    .chord-word {
        font-size: 1em;
        font-weight: bold;
        color: inherit;
    }

    .root-number {
        font-size: 1.2em;
        font-weight: 700;
        color: inherit;
        white-space: nowrap;
        margin-right: -0.3em;
    }

    .chord-markers {
        position: relative;
    }
</style>

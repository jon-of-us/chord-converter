<script lang="ts">
    import { generateChordSVG, generateChordShapeSVG } from "../chords/chordToSVG";
    import { onMount } from "svelte";
    import { editorConfig } from "../config";
    import * as ChordFileModel from "../models/ChordFile";
    import { editorStore } from "../stores/editorStore.svelte";
    import { themeStore } from "../stores/themeStore.svelte";
    import { fileStore } from "../stores/fileStore.svelte";
    import * as chordTypes from "../chords/chordTypes";

    const CHORD_ICON_GAP = 8; // px minimal horizontal gap between consecutive chord icons

    // Parse chordFile from fileStore (ground truth)
    let chordFile = $derived(
        ChordFileModel.ChordFile.parse(fileStore.currentContent),
    );
    let viewContainer: HTMLDivElement;

    // Generate SVGs based on chordFile and theme
    let chordSVGs = $derived.by(() => {
        const svgs = new Map<string, string>();
        chordFile.lines.forEach((line) => {
            if (line.type === "chords" && line.chordsOrWords) {
                line.chordsOrWords.forEach((cow) => {
                    if (cow.content instanceof chordTypes.Chord) {
                        const key = cow.content.id() + "-" + themeStore.current;
                        if (!svgs.has(key)) {
                            svgs.set(
                                key,
                                generateChordSVG(cow.content, themeStore.current),
                            );
                        }
                    }
                });
            }
        });
        console.log("Regenerated SVGs, total:", svgs.size);
        return svgs;
    });

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
                    const isWord =
                        container.classList.contains("word-container");
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

    // Re-align when content or zoom changes
    $effect(() => {
        chordFile.lines;
        editorStore.zoomLevel;
        setTimeout(alignChordIcons, 0);
    });

    // Autoscroll effect
    let animationFrameId: number | null = null;
    let scrollAccumulator = 0;

    $effect(() => {
        if (!editorStore.isAutoscrolling || !viewContainer) {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            return;
        }

        scrollAccumulator = 0; // Reset accumulator when starting
        const scroll = () => {
            if (!editorStore.isAutoscrolling || !viewContainer) return;

            // Convert speed multiplier to pixels per frame (at 60fps)
            // Scale with zoom level - higher zoom = faster scroll
            const zoomMultiplier = editorStore.zoomLevel / 100;
            const pixelsPerFrame =
                (editorStore.autoscrollSpeed *
                    editorConfig.autoscrollPixelsPerSecond *
                    zoomMultiplier) /
                60;
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

    onMount(() => {
        alignChordIcons();
        window.addEventListener("resize", alignChordIcons);

        return () => {
            window.removeEventListener("resize", alignChordIcons);
        };
    });
</script>

<div
    class="chord-view"
    bind:this={viewContainer}
    style="font-size: {editorStore.zoomLevel}%; background-color: {themeStore.current ===
    'light'
        ? '#ffffff'
        : '#1e1e1e'}; color: {themeStore.current === 'light' ? '#333333' : '#e0e0e0'};"
>
    {#each chordFile.lines as line, idx}
        {#if line.type === "metadata" && line.metadataField === "title"}
            <div class="heading">
                {line.content}
            </div>
        {:else if line.type === "metadata"}
            <div class="metadata">
                <span class="metadata-field">{line.metadataField}:</span> {line.content}
            </div>
        {:else if line.type === "heading"}
            <div class="heading">
                {line.content}
            </div>
        {:else if line.type === "empty"}
            <div class="lyrics"></div>
        {:else if line.type === "subheading"}
            <div class="subheading">{line.content}</div>
        {:else if line.type === "lyrics"}
            <div class="lyrics">{line.content}</div>
        {:else if line.type === "chords"}
            <div class="chord-line-wrapper">
                <div class="lyrics chord-markers">
                    {#each Array(line.maxChordPosition + 1) as _, idx}
                        {#each line.chordsOrWords?.filter((c) => c.position === idx) as cow}
                            <span class="marker chord-marker" id={cow.markerId}>
                                {#if cow.content instanceof chordTypes.Chord}
                                    <div class="chord-container">
                                        {#if editorStore.viewMode === "chords"}
                                            <span class="root-number">
                                                {(cow.content.root +
                                                    chordFile.specifiedKey +
                                                    8) %
                                                    12}
                                            </span>
                                        {/if}
                                        {@html chordSVGs.get(
                                            cow.content.id() +
                                                "-" +
                                                themeStore.current,
                                        ) || ""}
                                    </div>
                                {:else}
                                    <div
                                        class="chord-container word-container"
                                        data-marker={cow.markerId}
                                    >
                                        <span class="chord-word">
                                            {cow.content}
                                        </span>
                                    </div>
                                {/if}
                            </span>
                        {/each}<!--
                        -->{" "}
                    {/each}
                </div>
            </div>
        {:else if line.type === "spacer"}
            <pre class="lyrics"> </pre>
        {/if}
    {/each}
</div>

<style>
    .chord-view {
        font-family:
            ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        line-height: 1.4;
        padding: 2rem 2rem 2rem 3rem;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
    }

    .lyrics {
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
        white-space: pre;
    }
</style>

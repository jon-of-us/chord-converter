# Chord Converter - Project Overview

A web-based application for viewing, editing, and managing chord sheets with advanced visualization capabilities.

Chord Converter is a Svelte-based progressive web app that allows musicians to view and edit chord sheets in `.chords` format with synchronized text and chord visualization, transpose chords automatically with intelligent key detection, visualize chords as SVG diagrams inspired by the tonnetz, manage files locally or in-browser storage and control playback with autoscroll and adjustable zoom levels.


## Technical Stack

- **Svelte 5** with reactive properties (`$derived`, `$effect`, `$props`)
- **TypeScript** for type safety
- **Vite** for fast development and optimized builds
- **File System Access API** for local folder integration
- **IndexedDB** for browser-based persistence

## Architecture

### Main Components

- **App.svelte**: Root component managing layout with sidebars and editor area
- **FileList.svelte**: File browser with tree structure for folder navigation
- **FileEditor.svelte**: Text editor with dual view modes (text/chords)
- **ChordView.svelte**: Chord visualization with alignment and autoscroll
- **ControlsSidebar.svelte**: Controls for zoom, transposition, and playback

### Core Libraries

- **chordParser.ts**: Parses chord notation and enharmonic equivalents
- **chordToSVG.ts**: Converts parsed chords to SVG tonnetz diagrams
- **fileStore.ts**: Svelte store managing application state
- **indexedDB.ts**: Browser storage operations
- **FolderPicker.svelte**: File System Access API integration

## File Format

Chord sheets use `.chords` format with the following structure:
```
Title: Song Name
Artist: Artist Name
Key: C Major

[Verse]
C      G
Words go here
Am     F
More words here

[Chorus]
C      F
Chorus lyrics
```

Lines are classified as chords (>35% chord density) or lyrics, with automatic formatting and alignment.

# New Chord System
Each note is represented by a number from 0-11, corresponding to the circle of fifths:
```
0 = G#
1 = D#
2 = A#
3 = F
4 = C 
5 = G
6 = D
7 = A
8 = E
9 = B
10 = F#
11 = C#
```

# Data Structures Overview

## Core Data Model: ChordFile

**Location:** `lib/models/ChordFile.ts`

```typescript
interface ChordFile {
  metadata: ChordFileMetadata;     // Title, artist, key, info
  specifiedKey: number | null;     // Key from metadata (0-11)
  detectedKey: number | null;      // Key detected from chords (0-11)
  lines: ParsedLine[];             // All lines (chords, lyrics, headings, etc)
  allChords: Chord[];              // Extracted chords for analysis
}
```

**Purpose:** Structured representation of a `.chords` file after parsing.

---

## Data Flow

### **1. File Loading**
- **editorService.loadFile()** → Reads file as string
- **chordFileService.parseChordFile(string)** → Parses to ChordFile
- **metadataService.ensureNumericKey(ChordFile)** → Normalizes key metadata
- **Stores:** String in `editorStore.editedContent`, key number in `editorStore.keyNumber`

### **2. View Modes**

#### Text Mode
- Uses: `editorStore.editedContent` (raw string)
- Component: `TextView.svelte`
- ChordFile: Not needed (cleared from store)

#### Structure/Chords Mode
- **EditorView.svelte** → Parses string to ChordFile on mode switch
- **Stores:** ChordFile in `editorStore.parsedChordFile` (cached)
- **ChordViewContainer.svelte** → Receives cached ChordFile
- **ChordView.svelte** → Renders ChordFile visually

### **3. Transpose Operation**
- **EditorControls** → Calls `editorService.transpose(file, offset)`
- **Uses:** Cached `editorStore.parsedChordFile` (no re-parsing)
- **metadataService.transposeKey(ChordFile, offset)** → Updates ChordFile
- **Stores:** Updated ChordFile + serialized string in store

---

## Key Services

### **chordFileService**
- `parseChordFile(string)` → ChordFile - Parse .chords file content
- `serializeChordFile(ChordFile)` → string - Convert back to file format

### **metadataService**
- `ensureNumericKey(ChordFile)` → KeyUpdateResult - Normalize key to 0-11
- `transposeKey(ChordFile, offset)` → KeyUpdateResult - Transpose by semitones

### **editorService**
- `loadFile()` - Load file and parse if needed
- `saveFile()` - Save string to disk
- `transpose()` - Transpose using cached ChordFile
- `ensureNumericKey()` - Ensure key when entering visual mode

---

## Store State

### **editorStore** (src/lib/stores/editorStore.ts)
```typescript
{
  viewMode: 'text' | 'structure' | 'chords',
  editedContent: string,              // Always maintained (for text editing)
  parsedChordFile: ChordFile | null,  // Only in structure/chords mode (cached)
  keyNumber: number,                  // Current key (0-11)
  zoomLevel: number,
  isAutoscrolling: boolean,
  // ... other UI state
}
```

### **fileStore** (src/lib/stores/fileStore.ts)
```typescript
{
  currentFile: FileEntry | null,
  currentContent: string,  // Last saved content
  files: FileEntry[],
  // ... file management state
}
```

---

## Performance Optimization

**Before:** Parse → Serialize → Parse on every operation (3-5 parses per interaction)

**After:** Parse once on mode switch, cache ChordFile, use it directly (1 parse per mode switch)

- ✅ No reactive parsing in ChordViewContainer
- ✅ Transpose uses cached ChordFile
- ✅ Text mode doesn't maintain ChordFile (unnecessary)

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
- **ChordFile.parse(string)** → Parses to ChordFile  
- **metadataService.ensureNumericKey(ChordFile)** → Normalizes key metadata
- **Stores:** String in `editorStore.editedContent`, key number in `editorStore.keyNumber`

### **2. View Modes**

#### Text Mode
- Uses: `editorStore.editedContent` (raw string)
- Component: `TextView.svelte`

#### Structure/Chords Mode
- **ChordView.svelte** → Derives `chordFile` from `editorStore.editedContent` (reactive parsing)
- **All props** → Derived from `editorStore` and `themeStore` (no prop passing)
- **Single source of truth:** `editedContent` string in store

### **3. Transpose Operation**
- **EditorControls** → Calls `editorService.transpose(file, offset)`
- **editorService** → Parses `editedContent`, transposes, serializes, updates store
- **ChordView** → Automatically re-renders from updated `editedContent` (reactive)

---

## Key Services

### **ChordFile class methods**
- `ChordFile.parse(string)` → ChordFile - Parse .chords file content (static method)
- `chordFile.serialize()` → string - Convert instance back to file format (instance method)

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
  editedContent: string,              // Single source of truth
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

**Architecture:** Parse-on-demand with reactive derivations

- ✅ ChordView derives `chordFile` from `editedContent` (reactive $derived)
- ✅ All props come directly from stores (no prop drilling)
- ✅ Transpose updates `editedContent` → ChordView re-parses automatically
- ✅ Single source of truth: `editedContent` string

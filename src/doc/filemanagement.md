# File Management System

This document describes how the file management system works in the chord converter application.

## Overview

The application supports two storage modes:
- **Browser Mode**: Files stored in IndexedDB (persistent browser storage)
- **Filesystem Mode**: Files stored on user's local disk via File System Access API

## Architecture

### Core Components

#### 1. Stores

##### `fileStore` (Data/Application State)
Location: `src/lib/stores/fileStore.ts`

**Purpose**: Manages file data and application state

**Responsibilities**:
- Storage mode tracking (`browser` or `filesystem`)
- Folder handle (for File System Access API)
- **File list** (`files: FileEntry[]`) - All available files
- **Current file** (`currentFile: FileEntry | null`) - File open in editor
- **Current content** (`currentContent: string`) - Loaded text being edited
- Error and loading states

**Key State**:
```typescript
interface AppState {
  storageMode: StorageMode;
  folderHandle: FileSystemDirectoryHandle | null;
  files: FileEntry[];
  currentFile: FileEntry | null;      // What's open in editor
  currentContent: string;              // Loaded content being edited
  error: string | null;
  loading: boolean;
}
```

##### `fileManagerStore` (UI State)
Location: `src/lib/stores/fileManagerStore.ts`

**Purpose**: Manages file tree UI interactions

**Responsibilities**:
- **Expanded folders** tracking (which folders are open/closed in tree)
- **Selected path** (what's highlighted in the file tree)
- **Inline editing** state (for file/folder rename operations)
- UI helper methods (toggle, expand, collapse)

**Key State**:
```typescript
interface FileManagerState {
  expandedFolders: Set<string>;       // Which folders are expanded in tree
  editingPath: string | null;         // Path being renamed
  editingValue: string;                // Current rename input value
  selectedPath: string | null;        // Highlighted item in tree (file or folder)
}
```

**Important Distinction**:
- `fileManagerStore.selectedPath` = What's **highlighted in the file tree** (UI state)
- `fileStore.currentFile` = What's **open in the editor** (application state)

These serve different purposes:
- Clicking a folder → `selectedPath` changes, editor file stays open
- Clicking a file → Both `selectedPath` AND `currentFile` change

#### 2. FileEntry Structure

```typescript
interface FileEntry {
  name: string;                         // Filename only (e.g., "song.chords")
  path: string;                         // Full relative path (e.g., "subfolder/song.chords")
  handle?: FileSystemFileHandle;        // Used in filesystem mode only
  content?: string;                     // Used in browser mode only
}
```

**Mode-specific fields**:
- **Browser mode**: `content` field stores the file text in memory (read from IndexedDB)
- **Filesystem mode**: `handle` provides access to the actual file on disk

#### 3. Storage Adapters

Location: `src/lib/services/storage/`

**IFileStorage Interface**: Common interface for both storage modes
- `readFile(file: FileEntry): Promise<string>`
- `writeFile(file: FileEntry, content: string): Promise<void>`
- `createFile(fileName: string, folderPath: string, content: string): Promise<FileEntry>`
- `deleteFile(file: FileEntry): Promise<void>`
- `renameFile(file: FileEntry, newName: string, newFolderPath: string): Promise<FileEntry>`
- `listFiles(): Promise<FileEntry[]>`

**BrowserStorage** (`src/lib/services/storage/BrowserStorage.ts`)
- Stores files in IndexedDB with full path as key
- `readFile()` returns `file.content` directly from memory
- All operations use IndexedDB utilities

**Filesystem** (`src/lib/services/storage/Filesystem.ts`)
- Uses File System Access API to access user's local files
- `readFile()` uses `file.handle.getFile()` to read from disk
- Creates/navigates folder hierarchies as needed

#### 4. Services

##### `fileService` (`src/lib/services/fileService.ts`)
**Purpose**: Low-level file I/O operations via storage adapters

**Key Functions**:
- `setStorage(handle)` - Switches between BrowserStorage and Filesystem
- `readFile(file)` - Reads file content
- `saveFile(file, content)` - Writes file content
- `createFile(fileName, folderPath)` - Creates new file
- `deleteFile(file)` - Deletes file
- `renameFile(file, newName)` - Renames file

##### `fileManagerService` (`src/lib/services/fileManagerService.ts`)
**Purpose**: High-level file manager business logic

**Key Functions**:
- `buildFileTree()` - Builds tree structure from flat file list
- `selectFile(file)` - Loads a file into the editor
- `createFile(fileName)` - Creates file (with folder context from selection)
- `deleteItem(path)` - Deletes file or folder
- `renameItem()` - Renames file or folder
- `handleFileDrop()` - Handles drag & drop file import

##### `editorService` (`src/lib/services/editorService.ts`)
**Purpose**: Editor-specific file operations

**Key Functions**:
- `loadFile(file)` - Loads file into editor (processes .chords metadata)
- `saveFile(file, content)` - Saves from editor
- `transposeFile(semitones)` - Transpose and save

## Data Flow

### Opening a File

1. User clicks file in tree → `FileTreeItem.svelte` calls `onSelectFile(file)`
2. `FileManager.svelte` passes `fileManagerService.selectFile` as callback
3. `selectFile()` calls:
   - `fileService.readFile(file)` - Gets content via storage adapter
   - `fileStore.setCurrentFile(file)` - Updates editor state
   - `fileStore.setCurrentContent(content)` - Sets loaded content
4. `Editor.svelte` reacts to `$fileStore.currentFile` change
5. Calls `editorService.loadFile(file)` which:
   - Processes .chords metadata (ensures numeric key)
   - Updates `editorStore` with parsed content

### Creating a File

1. User clicks "New +" button or uses context menu
2. `fileManagerService.createFile(fileName)`:
   - Gets selected folder context from `fileManagerStore.selectedPath`
   - Parses folder path from input (supports "folder/file" syntax)
   - Calls storage adapter's `createFile()`
   - Adds to `fileStore.files` list
   - Opens new file in editor

### Saving a File

1. User presses Ctrl+S or clicks save button
2. `editorService.saveFile(file, content)`:
   - Calls `fileService.saveFile()` via storage adapter
   - Updates `fileStore.currentContent` with saved content
   - Updates `editorStore.lastSavedContent` for dirty checking

### Switching Storage Modes

**Browser → Filesystem**:
1. User clicks "Connect Folder" and picks directory
2. `FolderPicker.svelte` calls `fileStore.setFolderHandle(handle)`
3. `fileService.setStorage(handle)` creates new `Filesystem` instance
4. Scans directory for .chords files
5. Updates `fileStore.files` with discovered files

**Filesystem → Browser**:
1. User clicks "Disconnect"
2. Calls `fileStore.setFolderHandle(null)`
3. `fileService.setStorage(null)` creates new `BrowserStorage` instance
4. Loads files from IndexedDB

## UI Components

### FileManager.svelte
- Renders file tree using `FileTreeItem` recursively
- Handles drag & drop for file import (browser mode only)
- "New +" button for creating files/folders
- Shows folder context in prompts

### FileTreeItem.svelte
- Renders single tree node (file or folder)
- Handles expand/collapse for folders
- Shows selection state
- Inline rename editing
- Context menu (rename, delete, download)

### FolderPicker.svelte
- Storage mode switcher
- "Connect Folder" / "Disconnect" button
- Handles folder selection via File System Access API
- Auto-opens first file after scanning

## Edge Cases

### Folder Creation
- Create folder by entering path ending with `/` (e.g., "newfolder/")
- Creates a `.keep` file inside to ensure folder exists (filesystem mode)

### Path Handling
- All paths are relative to root: `"subfolder/file.chords"`
- Root files have no `/` in path: `"file.chords"`
- Folders tracked separately (extracted from file paths)

### File Syncing
- Browser mode: Changes only in memory/IndexedDB
- Filesystem mode: Changes written to disk immediately
- No auto-refresh from disk (reopen folder to see external changes)

## Common Operations

### How file selection works:
```typescript
// In file tree:
fileManagerStore.select(path)        // Highlights in UI
fileStore.setCurrentFile(file)       // Opens in editor

// These are independent:
// - Can select a folder without changing editor
// - Can have file open while different item is selected
```

### How content loading works:
```typescript
// Different for each mode:
// Browser mode:
content = file.content               // From memory

// Filesystem mode:
const fileData = await file.handle.getFile()
content = await fileData.text()      // From disk
```

### How new file context works:
```typescript
// Uses selectedPath to determine where to create:
// - If file is selected → extract its folder
// - If folder is selected → use that folder
// - If nothing selected → root

const folderPath = fileManagerStore.getSelectedFolderPath(state, files)
```

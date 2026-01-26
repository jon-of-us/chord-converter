import type { FileEntry } from '../stores/fileStore';
import { loadAllBrowserFiles, type BrowserFile } from '../utils/indexedDB';
import { fileConfig } from '../config';
import type { IFileStorage } from './storage/IFileStorage';
import { BrowserStorage } from './storage/BrowserStorage';
import { Filesystem } from './storage/Filesystem';

/**
 * File Service - Uses storage adapters for file operations
 */

export interface ScanResult {
  files: FileEntry[];
  folders: Set<string>;
}

// Storage instances
let currentStorage: IFileStorage | null = null;

/**
 * Set the storage implementation
 */
export function setStorage(folderHandle: FileSystemDirectoryHandle | null): void {
  if (folderHandle) {
    currentStorage = new Filesystem(folderHandle);
  } else {
    currentStorage = new BrowserStorage();
  }
}

/**
 * Get current storage (creates BrowserStorage if none set)
 */
function getStorage(): IFileStorage {
  if (!currentStorage) {
    currentStorage = new BrowserStorage();
  }
  return currentStorage;
}

/**
 * Read file content
 */
export async function readFile(file: FileEntry): Promise<string> {
  return getStorage().readFile(file);
}

/**
 * Save file content
 */
export async function saveFile(file: FileEntry, content: string): Promise<void> {
  return getStorage().writeFile(file, content);
}

/**
 * Create a new file
 */
export async function createFile(
  fileName: string,
  folderPath: string,
  folderHandle?: FileSystemDirectoryHandle,
  isEmpty: boolean = false
): Promise<FileEntry> {
  const fileContent = isEmpty ? '' : fileConfig.newFileTemplate;
  return getStorage().createFile(fileName, folderPath, fileContent);
}

/**
 * Delete a file
 */
export async function deleteFile(
  file: FileEntry,
  folderHandle?: FileSystemDirectoryHandle
): Promise<void> {
  return getStorage().deleteFile(file);
}

/**
 * Rename a file
 */
export async function renameFile(
  file: FileEntry,
  newName: string,
  folderHandle?: FileSystemDirectoryHandle
): Promise<FileEntry> {
  const fullNewName = newName.endsWith('.chords') ? newName : `${newName}.chords`;
  const pathParts = file.path.split('/');
  const folderPath = pathParts.slice(0, -1).join('/');
  
  return getStorage().renameFile(file, fullNewName, folderPath);
}

/**
 * List all files from current storage
 */
export async function listFiles(): Promise<FileEntry[]> {
  return getStorage().listFiles();
}

/**
 * Import multiple files (drag-and-drop support)
 */
export async function importFiles(files: Array<{ path: string; content: string }>): Promise<FileEntry[]> {
  return getStorage().importFiles(files);
}

/**
 * Scan a directory for .chords files and folders (Filesystem mode only)
 */
export async function scanDirectory(dirHandle: FileSystemDirectoryHandle): Promise<ScanResult> {
  const files: FileEntry[] = [];
  const folders = new Set<string>();

  async function scan(handle: FileSystemDirectoryHandle, path: string) {
    for await (const entry of handle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.chords')) {
        files.push({ name: entry.name, path: entryPath, handle: entry as FileSystemFileHandle });
      } else if (entry.kind === 'directory') {
        folders.add(entryPath);
        await scan(entry as FileSystemDirectoryHandle, entryPath);
      }
    }
  }

  await scan(dirHandle, '');
  files.sort((a, b) => a.path.localeCompare(b.path));
  
  return { files, folders };
}

/**
 * Load all files from browser storage (legacy)
 */
export async function loadBrowserFiles(): Promise<FileEntry[]> {
  const browserFiles = await loadAllBrowserFiles();
  return browserFiles.map((bf: BrowserFile) => ({ 
    name: bf.name.split('/').pop() || bf.name, 
    path: bf.name, 
    content: bf.content 
  }));
}

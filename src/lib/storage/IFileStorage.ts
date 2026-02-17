import type { FileEntry } from '../stores/fileStore.svelte';

/**
 * IFileStorage - Interface for file storage operations
 * Implementations: BrowserStorage (IndexedDB), Filesystem (File System Access API)
 */
export interface IFileStorage {
  /**
   * Read file content
   */
  readFile(file: FileEntry): Promise<string>;

  /**
   * Write/save file content
   */
  writeFile(file: FileEntry, content: string): Promise<void>;

  /**
   * Create a new file
   * @param fileName - Just the filename
   * @param folderPath - Relative folder path (empty string for root)
   * @param content - Initial file content
   * @returns FileEntry with proper path
   */
  createFile(fileName: string, folderPath: string, content: string): Promise<FileEntry>;

  /**
   * Delete a file
   */
  deleteFile(file: FileEntry): Promise<void>;

  /**
   * Rename a file (may involve delete + create)
   */
  renameFile(file: FileEntry, newName: string, newFolderPath: string): Promise<FileEntry>;

  /**
   * List all files (recursively scans folders)
   */
  listFiles(): Promise<FileEntry[]>;

  /**
   * Bulk import files (used for drag-and-drop)
   * @param files - Array of {path, content} to import
   */
  importFiles(files: Array<{ path: string; content: string }>): Promise<FileEntry[]>;
}

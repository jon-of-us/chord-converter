import type { IFileStorage } from './IFileStorage';
import type { FileEntry } from '../../stores/fileStore.svelte';
import * as indexedDB from '../../utils/indexedDB';

/**
 * BrowserStorage - IndexedDB implementation
 * Stores files with full path support (e.g., "folder/subfolder/file.chords")
 */
export class BrowserStorage implements IFileStorage {
  async readFile(file: FileEntry): Promise<string> {
    return String(file.content || '');
  }

  async writeFile(file: FileEntry, content: string): Promise<void> {
    // In browser mode, path is used as the key
    await indexedDB.saveBrowserFile(file.path, content);
  }

  async createFile(fileName: string, folderPath: string, content: string): Promise<FileEntry> {
    const path = folderPath ? `${folderPath}/${fileName}` : fileName;
    await indexedDB.saveBrowserFile(path, content);
    
    return {
      name: fileName,
      path: path,
      content: content,
    };
  }

  async deleteFile(file: FileEntry): Promise<void> {
    await indexedDB.deleteBrowserFile(file.path);
  }

  async renameFile(file: FileEntry, newName: string, newFolderPath: string): Promise<FileEntry> {
    const content = await this.readFile(file);
    const newPath = newFolderPath ? `${newFolderPath}/${newName}` : newName;
    
    await indexedDB.deleteBrowserFile(file.path);
    await indexedDB.saveBrowserFile(newPath, content);
    
    return {
      name: newName,
      path: newPath,
      content: content,
    };
  }

  async listFiles(): Promise<FileEntry[]> {
    const browserFiles = await indexedDB.loadAllBrowserFiles();
    return browserFiles.map(bf => {
      // Extract filename from path
      const parts = bf.name.split('/');
      const fileName = parts[parts.length - 1];
      
      return {
        name: fileName,
        path: bf.name, // The name field in IndexedDB stores the full path
        content: bf.content,
      };
    });
  }

  async importFiles(files: Array<{ path: string; content: string }>): Promise<FileEntry[]> {
    const imported: FileEntry[] = [];
    
    for (const file of files) {
      const parts = file.path.split('/');
      const fileName = parts[parts.length - 1];
      
      await indexedDB.saveBrowserFile(file.path, file.content);
      
      imported.push({
        name: fileName,
        path: file.path,
        content: file.content,
      });
    }
    
    return imported;
  }
}

import type { IFileStorage } from './IFileStorage';
import type { FileEntry } from '../../stores/fileStore.svelte';

/**
 * Filesystem - File System Access API implementation
 * Stores files on the user's actual filesystem
 */
export class Filesystem implements IFileStorage {
  constructor(private folderHandle: FileSystemDirectoryHandle) {}

  async readFile(file: FileEntry): Promise<string> {
    if (!file.handle) {
      throw new Error('File handle not available');
    }
    const fileData = await file.handle.getFile();
    return await fileData.text();
  }

  async writeFile(file: FileEntry, content: string): Promise<void> {
    if (!file.handle) {
      throw new Error('File handle not available');
    }
    const writable = await file.handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async createFile(fileName: string, folderPath: string, content: string): Promise<FileEntry> {
    let targetFolder = this.folderHandle;
    
    // Navigate to target folder
    if (folderPath) {
      for (const part of folderPath.split('/')) {
        targetFolder = await targetFolder.getDirectoryHandle(part, { create: true });
      }
    }

    const fileHandle = await targetFolder.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    const path = folderPath ? `${folderPath}/${fileName}` : fileName;
    return { name: fileName, path: path, handle: fileHandle };
  }

  async deleteFile(file: FileEntry): Promise<void> {
    const pathParts = file.path.split('/');
    let targetFolder = this.folderHandle;
    
    // Navigate to parent folder
    for (let i = 0; i < pathParts.length - 1; i++) {
      targetFolder = await targetFolder.getDirectoryHandle(pathParts[i], { create: false });
    }

    await targetFolder.removeEntry(file.name);
  }

  async renameFile(file: FileEntry, newName: string, newFolderPath: string): Promise<FileEntry> {
    const content = await this.readFile(file);
    
    // Create new file
    const newFile = await this.createFile(newName, newFolderPath, content);
    
    // Delete old file
    await this.deleteFile(file);
    
    return newFile;
  }

  async listFiles(): Promise<FileEntry[]> {
    const files: FileEntry[] = [];

    async function scan(handle: FileSystemDirectoryHandle, path: string) {
      for await (const entry of handle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.chords')) {
          files.push({ name: entry.name, path: entryPath, handle: entry as FileSystemFileHandle });
        } else if (entry.kind === 'directory') {
          await scan(entry as FileSystemDirectoryHandle, entryPath);
        }
      }
    }

    await scan(this.folderHandle, '');
    files.sort((a, b) => a.path.localeCompare(b.path));
    
    return files;
  }

  async importFiles(files: Array<{ path: string; content: string }>): Promise<FileEntry[]> {
    const imported: FileEntry[] = [];
    
    for (const file of files) {
      const parts = file.path.split('/');
      const fileName = parts[parts.length - 1];
      const folderPath = parts.slice(0, -1).join('/');
      
      const fileEntry = await this.createFile(fileName, folderPath, file.content);
      imported.push(fileEntry);
    }
    
    return imported;
  }
}

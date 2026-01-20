import type { FileEntry } from '../stores/fileStore';
import { saveBrowserFile, deleteBrowserFile, renameBrowserFile, loadAllBrowserFiles, type BrowserFile } from '../utils/indexedDB';
import { fileConfig } from '../config';

/**
 * File Service - Minimal interface for file operations
 */

export interface ScanResult {
  files: FileEntry[];
  folders: Set<string>;
}

/**
 * Read file content
 */
export async function readFile(file: FileEntry): Promise<string> {
  if (file.handle) {
    const fileData = await file.handle.getFile();
    return await fileData.text();
  }
  return String(file.content || '');
}

/**
 * Save file content
 */
export async function saveFile(file: FileEntry, content: string): Promise<void> {
  if (file.handle) {
    const writable = await file.handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    await saveBrowserFile(file.name, content);
  }
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
  // Use fileName as-is (formatting is handled by caller)
  const fullFileName = fileName;
  const filePath = folderPath ? `${folderPath}/${fullFileName}` : fullFileName;
  const fileContent = isEmpty ? '' : fileConfig.newFileTemplate;

  if (folderHandle) {
    let targetFolder = folderHandle;
    if (folderPath) {
      for (const part of folderPath.split('/')) {
        targetFolder = await targetFolder.getDirectoryHandle(part, { create: true });
      }
    }

    const fileHandle = await targetFolder.getFileHandle(fullFileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(fileContent);
    await writable.close();

    return { name: fullFileName, path: filePath, handle: fileHandle };
  } else {
    const content = String(fileContent);
    await saveBrowserFile(fullFileName, content);
    return { name: fullFileName, path: fullFileName, content };
  }
}

/**
 * Delete a file
 */
export async function deleteFile(
  file: FileEntry,
  folderHandle?: FileSystemDirectoryHandle
): Promise<void> {
  if (file.handle && folderHandle) {
    const pathParts = file.path.split('/');
    let targetFolder = folderHandle;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      targetFolder = await targetFolder.getDirectoryHandle(pathParts[i], { create: false });
    }

    await targetFolder.removeEntry(file.name);
  } else {
    await deleteBrowserFile(file.name);
  }
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
  pathParts[pathParts.length - 1] = fullNewName;
  const newPath = pathParts.join('/');

  if (file.handle && folderHandle) {
    const content = await readFile(file);
    let targetFolder = folderHandle;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      targetFolder = await targetFolder.getDirectoryHandle(pathParts[i], { create: false });
    }

    const newHandle = await targetFolder.getFileHandle(fullNewName, { create: true });
    const writable = await newHandle.createWritable();
    await writable.write(content);
    await writable.close();

    await targetFolder.removeEntry(file.name);

    return { name: fullNewName, path: newPath, handle: newHandle };
  } else {
    await renameBrowserFile(file.name, fullNewName);
    return { name: fullNewName, path: newPath, content: file.content };
  }
}

/**
 * Scan a directory for .chords files and folders
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
 * Load all files from browser storage
 */
export async function loadBrowserFiles(): Promise<FileEntry[]> {
  const browserFiles = await loadAllBrowserFiles();
  return browserFiles.map((bf: BrowserFile) => ({ name: bf.name, path: bf.name, content: bf.content }));
}

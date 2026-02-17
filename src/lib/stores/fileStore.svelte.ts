import type { IFileStorage } from '../storage/IFileStorage';
import { BrowserStorage } from '../storage/BrowserStorage';
import { Filesystem } from '../storage/Filesystem';
import * as indexedDB from '../utils/indexedDB';
import { fileConfig } from '../config';
import { fileManagerStore } from './fileManagerStore.svelte';

export type StorageMode = 'browser' | 'filesystem';

export class FileEntry {
  constructor(
    public name: string,
    public path: string, // Full path relative to root (e.g., "subfolder/file.chords")
    public handle?: FileSystemFileHandle, // filesystem mode
    public content?: string // browser mode
  ) {}
}

class FileStore {
  storageMode = $state<StorageMode>('browser');
  folderHandle = $state<FileSystemDirectoryHandle | null>(null);
  files = $state<FileEntry[]>([]);
  error = $state<string | null>(null);
  loading = $state(false);

  storage: IFileStorage = new BrowserStorage();

  // ===== File Operations =====

  async createFile(
    fileName: string,
    folderPath: string,
    isEmpty: boolean = false
  ): Promise<void> {
    // Get selected folder context
    const selectedFolderPath = folderPath;

    // Parse folder path and file name
    let targetFolderPath = selectedFolderPath;
    let actualFileName = fileName;

    if (fileName.includes('/')) {
      const parts = fileName.split('/');
      actualFileName = parts.pop() || '';
      const relativePath = parts.join('/');
      targetFolderPath = selectedFolderPath ? `${selectedFolderPath}/${relativePath}` : relativePath;
    }

    // If fileName ends with /, create folder by creating a .keep file
    if (fileName.endsWith('/')) {
      try {
        this.loading = true;
        this.error = null;

        const keepFileName = '.keep';
        const fileContent = '';
        const newFile = await this.storage.createFile(keepFileName, targetFolderPath, fileContent);
        this.addFile(newFile);

        return;
      } catch (error: any) {
        this.error = `Error creating folder: ${error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    }

    // Determine file name and content
    let fullFileName: string;
    let isEmptyFile = false;

    const lastDotIndex = actualFileName.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0;

    if (hasExtension) {
      fullFileName = actualFileName;
      isEmptyFile = true;
    } else {
      fullFileName = `${actualFileName}.chords`;
      isEmptyFile = false;
    }

    const fullPath = targetFolderPath ? `${targetFolderPath}/${fullFileName}` : fullFileName;

    // Check if file already exists
    if (this.files.some(f => f.path === fullPath)) {
      this.error = `File "${fullPath}" already exists`;
      throw new Error(`File "${fullPath}" already exists`);
    }

    try {
      this.loading = true;
      this.error = null;

      const fileContent = isEmptyFile || isEmpty ? '' : fileConfig.newFileTemplate;
      const newFile = await this.storage.createFile(fullFileName, targetFolderPath, fileContent);

      this.addFile(newFile);
      
      // Select the new file and load its content
      fileManagerStore.selectedPath = newFile.path;
      await fileManagerStore.loadSelectedContent();
    } catch (error: any) {
      this.error = `Error creating file: ${error.message}`;
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async renameFile(file: FileEntry, newName: string): Promise<void> {
    try {
      this.loading = true;

      const fullNewName = newName.endsWith('.chords') ? newName : `${newName}.chords`;
      const pathParts = file.path.split('/');
      const folderPath = pathParts.slice(0, -1).join('/');

      const newFile = await this.storage.renameFile(file, fullNewName, folderPath);

      this.removeFile(file.path);
      this.addFile(newFile);

      // Update selectedPath if it was the renamed file
      if (fileManagerStore.selectedPath === file.path) {
        fileManagerStore.selectedPath = newFile.path;
      }
    } catch (error: any) {
      this.error = `Error renaming: ${error.message}`;
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async renameFolder(oldPath: string, newName: string): Promise<void> {
    try {
      this.loading = true;

      const filesToRename = this.files.filter(f => f.path.startsWith(oldPath + '/'));

      if (filesToRename.length === 0) {
        this.error = 'Cannot rename empty folder';
        throw new Error('Cannot rename empty folder');
      }

      // Extract parent folder path from oldPath
      const pathParts = oldPath.split('/');
      const parentPath = pathParts.slice(0, -1).join('/');
      const newFolderPath = parentPath ? `${parentPath}/${newName}` : newName;

      // Rename each file in the folder
      for (const file of filesToRename) {
        const relativePath = file.path.substring(oldPath.length + 1);
        const newPath = `${newFolderPath}/${relativePath}`;
        const newFileName = file.name;

        // Extract the folder path for the new file (handles nested subfolders)
        const newPathParts = newPath.split('/');
        const newFileFolderPath = newPathParts.slice(0, -1).join('/');

        // Create new file
        const content = await this.storage.readFile(file);
        const newFile = await this.storage.createFile(newFileName, newFileFolderPath, content);

        // Delete old file
        await this.storage.deleteFile(file);

        this.removeFile(file.path);
        this.addFile(newFile);
      }
    } catch (error: any) {
      this.error = `Error renaming folder: ${error.message}`;
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async deleteFile(file: FileEntry): Promise<void> {
    try {
      this.loading = true;

      await this.storage.deleteFile(file);
      this.removeFile(file.path);
    } catch (error: any) {
      this.error = `Error deleting: ${error.message}`;
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      this.loading = true;

      const filesToDelete = this.files.filter(f => f.path.startsWith(folderPath + '/'));

      if (filesToDelete.length === 0) {
        this.error = 'Folder is empty or does not exist';
        throw new Error('Folder is empty');
      }

      // Delete all files in the folder
      for (const file of filesToDelete) {
        await this.storage.deleteFile(file);
        this.removeFile(file.path);
      }
    } catch (error: any) {
      this.error = `Error deleting folder: ${error.message}`;
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async loadFilesFromFolder(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      console.log('Loading files from folder:', handle.name);

      const result = await this.scanDirectory(handle);

      console.log('Total files found:', result.files.length);

      this.files = result.files;
    } catch (error: any) {
      console.error('Error loading files:', error);
      this.error = `Error loading files: ${error.message}`;
      throw error;
    }
  }

  async loadBrowserFiles(): Promise<FileEntry[]> {
    const browserFiles = await indexedDB.loadAllBrowserFiles();
    return browserFiles.map((bf: indexedDB.BrowserFile) => ({
      name: bf.name.split('/').pop() || bf.name,
      path: bf.name,
      content: bf.content
    }));
  }

  async migrateBrowserFilesToFolder(
    handle: FileSystemDirectoryHandle,
    browserFiles: indexedDB.BrowserFile[]
  ): Promise<void> {
    for (const browserFile of browserFiles) {
      try {
        // Parse the path to handle subfolders
        const pathParts = browserFile.name.split('/');
        const fileName = pathParts.pop()!;
        
        // Navigate to or create the target directory
        let currentDir = handle;
        for (const folderName of pathParts) {
          currentDir = await currentDir.getDirectoryHandle(folderName, { create: true });
        }
        
        // Create the file in the target directory
        const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(browserFile.content);
        await writable.close();

        await indexedDB.deleteBrowserFile(browserFile.name);
      } catch (fileError: any) {
        console.error(`Error migrating file ${browserFile.name}:`, fileError);
      }
    }
  }

  async downloadFile(file: FileEntry): Promise<void> {
    try {
      this.error = null;

      const content = await this.storage.readFile(file);

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      this.error = `Error downloading file: ${error.message}`;
      throw error;
    }
  }

  async downloadAllFiles(files: FileEntry[]): Promise<void> {
    if (files.length === 0) {
      this.error = 'No files to download';
      throw new Error('No files to download');
    }

    try {
      this.loading = true;
      this.error = null;

      // Dynamic import of JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add all files to ZIP with their folder structure
      for (const file of files) {
        const content = await this.storage.readFile(file);
        zip.file(file.path, content);
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download the ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chords-files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      this.error = `Error downloading files: ${error.message}`;
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async handleFileDrop(dataTransfer: DataTransfer): Promise<void> {
    const files: Array<{ path: string; content: string }> = [];

    // Recursive function to read directory entries
    async function readEntry(entry: any, path: string = ''): Promise<void> {
      if (entry.isFile) {
        const file: File = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });

        const content = await file.text();
        const fullPath = path ? `${path}/${file.name}` : file.name;
        files.push({ path: fullPath, content });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries: any[] = await new Promise((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });

        const folderPath = path ? `${path}/${entry.name}` : entry.name;
        for (const subEntry of entries) {
          await readEntry(subEntry, folderPath);
        }
      }
    }

    try {
      this.loading = true;
      this.error = null;

      // Try modern entry API first
      const items = Array.from(dataTransfer.items);
      let hasEntryAPI = false;

      for (const item of items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          hasEntryAPI = true;
          await readEntry(entry);
        }
      }

      // Fallback for iOS and browsers without entry API
      if (!hasEntryAPI && dataTransfer.files.length > 0) {
        const fileList = Array.from(dataTransfer.files);
        for (const file of fileList) {
          if (file.type === 'text/plain' || file.name.endsWith('.chords')) {
            const content = await file.text();
            const path = (file as any).webkitRelativePath || file.name;
            files.push({ path, content });
          }
        }
      }

      console.log('Total files found:', files.length);

      if (files.length === 0) {
        this.error = 'No files found. Try using the import button.';
        return;
      }

      await this.importFiles(files);
    } catch (error: any) {
      this.error = `Error importing files: ${error.message}`;
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async importFiles(filesToImport: Array<{ path: string; content: string }>): Promise<void> {
    const existingPaths = new Set(this.files.map(f => f.path));
    const duplicates = filesToImport.filter(f => existingPaths.has(f.path));

    let finalFilesToImport = filesToImport;

    if (duplicates.length > 0) {
      const duplicateList = duplicates.map(d => `  • ${d.path}`).join('\n');
      const message = `The following files already exist:\n\n${duplicateList}\n\nWhat would you like to do?`;

      const action = confirm(
        `${message}\n\nOK = Replace existing files\nCancel = Skip duplicates`
      );

      if (action === null || !action) {
        const shouldAbort = confirm('Skip duplicate files and import the rest?');
        if (!shouldAbort) {
          this.error = 'Import cancelled';
          return;
        }
        finalFilesToImport = filesToImport.filter(f => !existingPaths.has(f.path));
      }
    }

    if (finalFilesToImport.length === 0) {
      this.error = 'No files to import';
      return;
    }

    // Import files
    const importedFiles = await this.storage.importFiles(finalFilesToImport);

    // Update store
    for (const file of importedFiles) {
      if (existingPaths.has(file.path)) {
        this.removeFile(file.path);
      }
      this.addFile(file);
    }

    this.error = null;
  }

  private async scanDirectory(dirHandle: FileSystemDirectoryHandle): Promise<{
    files: FileEntry[];
    folders: Set<string>;
  }> {
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

  // ===== State Management =====

  setFolderHandle(handle: FileSystemDirectoryHandle | null) {
    // Update storage implementation
    if (handle) {
      this.storage = new Filesystem(handle);
    } else {
      this.storage = new BrowserStorage();
    }

    this.folderHandle = handle;
    this.storageMode = handle ? 'filesystem' : 'browser';
    if (handle) {
      this.files = [];
    }
  }

  setFiles(files: FileEntry[]) {
    this.files = files;
  }

  private addFile(file: FileEntry) {
    this.files = [...this.files, file].sort((a, b) => a.path.localeCompare(b.path));
  }

  private removeFile(path: string) {
    this.files = this.files.filter(f => f.path !== path);
    if (fileManagerStore.selectedPath === path) {
      fileManagerStore.selectedPath = null;
      fileManagerStore.cachedContent = '';
    }
  }
}

export const fileStore = new FileStore();

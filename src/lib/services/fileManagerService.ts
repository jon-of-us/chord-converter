import * as fileService from './fileService';
import * as fileStoreModule from '../stores/fileStore';
import * as fileManagerStoreModule from '../stores/fileManagerStore';
import * as indexedDBModule from '../utils/indexedDB';

/**
 * File Manager Service
 * Coordinates file management UI workflows - uses fileService for actual I/O
 */

export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: fileStoreModule.FileEntry;
  children: TreeNode[];
}

/**
 * Build tree structure from files and folders
 */
export function buildFileTree(files: fileStoreModule.FileEntry[], folders: Set<string>): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();
  
  // Create folder nodes
  for (const folderPath of folders) {
    const parts = folderPath.split('/');
    let currentLevel = root;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      
      if (!folderMap.has(currentPath)) {
        const folderNode: TreeNode = {
          name: parts[i],
          path: currentPath,
          isFolder: true,
          children: [],
        };
        folderMap.set(currentPath, folderNode);
        currentLevel.push(folderNode);
      }
      
      currentLevel = folderMap.get(currentPath)!.children;
    }
  }
  
  // Add files
  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';
    
    // Navigate to parent folder
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      
      if (!folderMap.has(currentPath)) {
        const folderNode: TreeNode = {
          name: parts[i],
          path: currentPath,
          isFolder: true,
          children: [],
        };
        folderMap.set(currentPath, folderNode);
        currentLevel.push(folderNode);
      }
      
      currentLevel = folderMap.get(currentPath)!.children;
    }
    
    // Add file node
    currentLevel.push({
      name: file.name,
      path: file.path,
      isFolder: false,
      file,
      children: [],
    });
  }
  
  return root;
}

/**
 * Select and load a file
 */
export async function selectFile(file: fileStoreModule.FileEntry): Promise<void> {
  try {
    fileStoreModule.fileStore.setLoading(true);
    fileStoreModule.fileStore.setError(null);
    
    const content = await fileService.readFile(file);
    
    fileStoreModule.fileStore.setCurrentFile(file);
    fileStoreModule.fileStore.setCurrentContent(content);
  } catch (error: any) {
    fileStoreModule.fileStore.setError(`Error reading file: ${error.message}`);
    throw error;
  } finally {
    fileStoreModule.fileStore.setLoading(false);
  }
}

/**
 * Create a new file (supports folder paths like "folder/file.chords" or "folder/")
 */
export async function createFile(fileName: string): Promise<void> {
  // Parse folder path and file name
  let folderPath = '';
  let actualFileName = fileName;
  
  if (fileName.includes('/')) {
    const parts = fileName.split('/');
    actualFileName = parts.pop() || '';
    folderPath = parts.join('/');
  }
  
  // If fileName ends with /, create folder by creating a .keep file
  if (fileName.endsWith('/')) {
    const keepFileName = '.keep';
    const keepPath = folderPath ? `${folderPath}/.keep` : '.keep';
    
    try {
      fileStoreModule.fileStore.setLoading(true);
      fileStoreModule.fileStore.setError(null);
      
      let folderHandle: FileSystemDirectoryHandle | undefined;
      const files = fileStoreModule.fileStore;
      files.subscribe(state => { folderHandle = state.folderHandle || undefined; })();
      
      // Create empty .keep file in the folder
      const newFile = await fileService.createFile(keepFileName, folderPath, folderHandle, true);
      fileStoreModule.fileStore.addFile(newFile);
      
      return;
    } catch (error: any) {
      fileStoreModule.fileStore.setError(`Error creating folder: ${error.message}`);
      throw error;
    } finally {
      fileStoreModule.fileStore.setLoading(false);
    }
  }
  
  const fullFileName = actualFileName.endsWith('.chords') ? actualFileName : `${actualFileName}.chords`;
  const fullPath = folderPath ? `${folderPath}/${fullFileName}` : fullFileName;
  
  // Check if file already exists
  const files = fileStoreModule.fileStore;
  let currentFiles: fileStoreModule.FileEntry[] = [];
  files.subscribe(state => { currentFiles = state.files; })();
  
  if (currentFiles.some(f => f.path === fullPath)) {
    fileStoreModule.fileStore.setError(`File "${fullPath}" already exists`);
    throw new Error(`File "${fullPath}" already exists`);
  }
  
  try {
    fileStoreModule.fileStore.setLoading(true);
    fileStoreModule.fileStore.setError(null);
    
    let folderHandle: FileSystemDirectoryHandle | undefined;
    files.subscribe(state => { folderHandle = state.folderHandle || undefined; })();
    
    const newFile = await fileService.createFile(fullFileName, folderPath, folderHandle);
    
    fileStoreModule.fileStore.addFile(newFile);
    fileStoreModule.fileStore.setCurrentFile(newFile);
    
    // Load initial content
    const content = await fileService.readFile(newFile);
    fileStoreModule.fileStore.setCurrentContent(content);
  } catch (error: any) {
    fileStoreModule.fileStore.setError(`Error creating file: ${error.message}`);
    throw error;
  } finally {
    fileStoreModule.fileStore.setLoading(false);
  }
}

/**
 * Rename a file
 */
export async function renameFile(file: fileStoreModule.FileEntry, newName: string): Promise<void> {
  try {
    fileStoreModule.fileStore.setLoading(true);
    
    let folderHandle: FileSystemDirectoryHandle | undefined;
    fileStoreModule.fileStore.subscribe(state => { 
      folderHandle = state.folderHandle || undefined; 
    })();
    
    const newFile = await fileService.renameFile(file, newName, folderHandle);
    
    fileStoreModule.fileStore.deleteFile(file.path);
    fileStoreModule.fileStore.addFile(newFile);
    
    // Update current file if it was renamed
    fileStoreModule.fileStore.subscribe(state => {
      if (state.currentFile?.path === file.path) {
        fileStoreModule.fileStore.setCurrentFile(newFile);
      }
    })();
    
    fileManagerStoreModule.fileManagerStore.cancelEditing();
  } catch (error: any) {
    fileStoreModule.fileStore.setError(`Error renaming: ${error.message}`);
    throw error;
  } finally {
    fileStoreModule.fileStore.setLoading(false);
  }
}

/**
 * Rename a folder
 */
export async function renameFolder(oldPath: string, newName: string): Promise<void> {
  try {
    fileStoreModule.fileStore.setLoading(true);
    
    // Get all files in the folder
    let currentFiles: fileStoreModule.FileEntry[] = [];
    fileStoreModule.fileStore.subscribe(state => { currentFiles = state.files; })();
    
    const filesToRename = currentFiles.filter(f => f.path.startsWith(oldPath + '/'));
    
    if (filesToRename.length === 0) {
      fileStoreModule.fileStore.setError('Cannot rename empty folder');
      throw new Error('Cannot rename empty folder');
    }
    
    let folderHandle: FileSystemDirectoryHandle | undefined;
    fileStoreModule.fileStore.subscribe(state => { 
      folderHandle = state.folderHandle || undefined; 
    })();
    
    // Rename each file in the folder
    for (const file of filesToRename) {
      const relativePath = file.path.substring(oldPath.length + 1);
      const newPath = `${newName}/${relativePath}`;
      const newFileName = file.name;
      
      // Create new file
      const content = await fileService.readFile(file);
      const newFile = await fileService.createFile(newFileName, newName, folderHandle);
      await fileService.saveFile(newFile, content);
      
      // Delete old file
      await fileService.deleteFile(file, folderHandle);
      
      fileStoreModule.fileStore.deleteFile(file.path);
      fileStoreModule.fileStore.addFile(newFile);
    }
    
    fileManagerStoreModule.fileManagerStore.cancelEditing();
  } catch (error: any) {
    fileStoreModule.fileStore.setError(`Error renaming folder: ${error.message}`);
    throw error;
  } finally {
    fileStoreModule.fileStore.setLoading(false);
  }
}

/**
 * Delete a file
 */
export async function deleteFile(file: fileStoreModule.FileEntry): Promise<void> {
  try {
    fileStoreModule.fileStore.setLoading(true);
    
    let folderHandle: FileSystemDirectoryHandle | undefined;
    fileStoreModule.fileStore.subscribe(state => { 
      folderHandle = state.folderHandle || undefined; 
    })();
    
    await fileService.deleteFile(file, folderHandle);
    fileStoreModule.fileStore.deleteFile(file.path);
  } catch (error: any) {
    fileStoreModule.fileStore.setError(`Error deleting: ${error.message}`);
    throw error;
  } finally {
    fileStoreModule.fileStore.setLoading(false);
  }
}

/**
 * Delete a folder (deletes all files in it)
 */
export async function deleteFolder(folderPath: string): Promise<void> {
  try {
    fileStoreModule.fileStore.setLoading(true);
    
    // Get all files in the folder
    let currentFiles: fileStoreModule.FileEntry[] = [];
    fileStoreModule.fileStore.subscribe(state => { currentFiles = state.files; })();
    
    const filesToDelete = currentFiles.filter(f => f.path.startsWith(folderPath + '/'));
    
    if (filesToDelete.length === 0) {
      fileStoreModule.fileStore.setError('Folder is empty or does not exist');
      throw new Error('Folder is empty');
    }
    
    let folderHandle: FileSystemDirectoryHandle | undefined;
    fileStoreModule.fileStore.subscribe(state => { 
      folderHandle = state.folderHandle || undefined; 
    })();
    
    // Delete all files in the folder
    for (const file of filesToDelete) {
      await fileService.deleteFile(file, folderHandle);
      fileStoreModule.fileStore.deleteFile(file.path);
    }
  } catch (error: any) {
    fileStoreModule.fileStore.setError(`Error deleting folder: ${error.message}`);
    throw error;
  } finally {
    fileStoreModule.fileStore.setLoading(false);
  }
}

/**
 * Load files from folder handle
 */
export async function loadFilesFromFolder(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    console.log('Loading files from folder:', handle.name);
    
    const result = await fileService.scanDirectory(handle);
    
    console.log('Total files found:', result.files.length);
    
    fileStoreModule.fileStore.setFiles(result.files);
  } catch (error: any) {
    console.error('Error loading files:', error);
    fileStoreModule.fileStore.setError(`Error loading files: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate browser files to folder
 */
export async function migrateBrowserFilesToFolder(
  handle: FileSystemDirectoryHandle,
  browserFiles: indexedDBModule.BrowserFile[]
): Promise<void> {
  for (const browserFile of browserFiles) {
    try {
      const fileHandle = await handle.getFileHandle(browserFile.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(browserFile.content);
      await writable.close();
      
      await indexedDBModule.deleteBrowserFile(browserFile.name);
    } catch (fileError: any) {
      console.error(`Error migrating file ${browserFile.name}:`, fileError);
    }
  }
}

/**
 * Download a single file
 */
export async function downloadFile(file: fileStoreModule.FileEntry): Promise<void> {
  try {
    fileStoreModule.fileStore.setError(null);

    const content = await fileService.readFile(file);

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
    fileStoreModule.fileStore.setError(`Error downloading file: ${error.message}`);
    throw error;
  }
}

/**
 * Download all files
 */
export async function downloadAllFiles(files: fileStoreModule.FileEntry[]): Promise<void> {
  if (files.length === 0) {
    fileStoreModule.fileStore.setError('No files to download');
    throw new Error('No files to download');
  }

  try {
    fileStoreModule.fileStore.setLoading(true);
    fileStoreModule.fileStore.setError(null);

    for (const file of files) {
      const content = await fileService.readFile(file);
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error: any) {
    fileStoreModule.fileStore.setError(`Error downloading files: ${error.message}`);
    throw error;
  } finally {
    fileStoreModule.fileStore.setLoading(false);
  }
}

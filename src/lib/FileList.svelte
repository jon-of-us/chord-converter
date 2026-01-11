<script lang="ts" module>
  export interface TreeNode {
    name: string;
    path: string;
    isFolder: boolean;
    file?: any;
    children: TreeNode[];
    expanded: boolean;
  }
</script>

<script lang="ts">
  import { fileStore, type FileEntry } from './fileStore';
  import { loadBrowserFile, saveBrowserFile, renameBrowserFile, deleteBrowserFile } from './indexedDB';
  import { fileConfig } from './config';
  import FileListTree from './FileListTree.svelte';
  import FileListFooter from './FileListFooter.svelte';

  let editingFilePath = $state<string | null>(null);
  let editingValue = $state('');
  let expandedFolders = $state<Set<string>>(new Set());
  let allFolders = $state<Set<string>>(new Set());
  let currentFolderPath = $state<string>(''); // Current folder based on selection
  let selectedFolderPath = $state<string | null>(null); // Currently selected folder for actions

  // Build tree structure from flat file list and folder list
  function buildTree(files: FileEntry[]): TreeNode[] {
    const root: TreeNode[] = [];
    const folderMap = new Map<string, TreeNode>();

    // First, create all folder nodes from allFolders
    for (const folderPath of allFolders) {
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
            expanded: expandedFolders.has(currentPath),
          };
          
          folderMap.set(currentPath, folderNode);
          currentLevel.push(folderNode);
        } else {
          // Update expanded state for existing folder
          folderMap.get(currentPath)!.expanded = expandedFolders.has(currentPath);
        }
        
        currentLevel = folderMap.get(currentPath)!.children;
      }
    }

    // Then add files
    for (const file of files) {
      const parts = file.path.split('/');
      let currentLevel = root;
      let currentPath = '';

      // Create folder nodes for file path
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        
        if (!folderMap.has(currentPath)) {
          const folderNode: TreeNode = {
            name: parts[i],
            path: currentPath,
            isFolder: true,
            children: [],
            expanded: expandedFolders.has(currentPath),
          };
          
          folderMap.set(currentPath, folderNode);
          currentLevel.push(folderNode);
        } else {
          // Update expanded state for existing folder
          folderMap.get(currentPath)!.expanded = expandedFolders.has(currentPath);
        }
        
        currentLevel = folderMap.get(currentPath)!.children;
      }

      // Add file node
      currentLevel.push({
        name: file.name,
        path: file.path,
        isFolder: false,
        file: file,
        children: [],
        expanded: false,
      });
    }

    return root;
  }

  let tree = $derived(buildTree($fileStore.files));

  // Extract all folders from file paths when files change
  $effect(() => {
    const folders = new Set<string>();
    for (const file of $fileStore.files) {
      const parts = file.path.split('/');
      // Add all parent folders
      for (let i = 1; i < parts.length; i++) {
        const folderPath = parts.slice(0, i).join('/');
        folders.add(folderPath);
      }
    }
    allFolders = folders;
  });

  async function selectFile(file: FileEntry) {
    selectedFolderPath = null; // Clear folder selection when selecting a file
    try {
      fileStore.setLoading(true);
      fileStore.setError(null);
      
      // Update current folder based on file's parent directory
      const pathParts = file.path.split('/');
      currentFolderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
      
      let content = '';
      
      if ($fileStore.storageMode === 'filesystem' && file.handle) {
        // Read from filesystem
        const fileData = await file.handle.getFile();
        content = await fileData.text();
      } else {
        // Read from browser storage - create a copy to avoid reference issues
        content = String(file.content || '');
      }
      
      // Update store
      fileStore.setCurrentFile(file);
      fileStore.setCurrentContent(content);
      
    } catch (error: any) {
      fileStore.setError(`Error reading file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  function toggleFolder(path: string) {
    currentFolderPath = path; // Set as current folder when toggling
    selectedFolderPath = path; // Set as selected folder
    fileStore.setCurrentFile(null); // Clear file selection
    if (expandedFolders.has(path)) {
      expandedFolders.delete(path);
    } else {
      expandedFolders.add(path);
    }
    expandedFolders = new Set(expandedFolders);
  }

  async function createFolderFromPath(folderPath: string) {
    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && $fileStore.folderHandle) {
        let targetFolder = $fileStore.folderHandle;
        
        const folderParts = folderPath.split('/');
        for (const part of folderParts) {
          targetFolder = await targetFolder.getDirectoryHandle(part, { create: true });
        }
        
        // Add to folders set
        allFolders.add(folderPath);
        allFolders = new Set(allFolders);
        
        // Expand parent folders and the new folder
        const parts = folderPath.split('/');
        for (let i = 1; i <= parts.length; i++) {
          expandedFolders.add(parts.slice(0, i).join('/'));
        }
        expandedFolders = new Set(expandedFolders);
        
        selectedFolderPath = folderPath;
      } else {
        fileStore.setError('Folder creation is only available in filesystem mode');
      }

    } catch (error: any) {
      fileStore.setError(`Error creating folder: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  async function createFolder(parentPath: string = '') {
    // Use selected folder if no parent specified
    if (!parentPath) {
      parentPath = selectedFolderPath || '';
    }
    
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    // Remove any slashes from folder name
    const cleanFolderName = folderName.replace(/\//g, '');
    if (!cleanFolderName) {
      fileStore.setError('Invalid folder name');
      return;
    }

    const folderPath = parentPath ? `${parentPath}/${cleanFolderName}` : cleanFolderName;

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && $fileStore.folderHandle) {
        // Navigate to the parent folder and create new directory
        let targetFolder = $fileStore.folderHandle;
        
        if (parentPath) {
          const parts = parentPath.split('/');
          for (const part of parts) {
            targetFolder = await targetFolder.getDirectoryHandle(part, { create: false });
          }
        }

        await targetFolder.getDirectoryHandle(cleanFolderName, { create: true });
        
        // Add to folders set
        allFolders.add(folderPath);
        allFolders = new Set(allFolders);
        
        // Expand parent folder if creating subfolder
        if (parentPath) {
          expandedFolders.add(parentPath);
        }
        expandedFolders.add(folderPath);
        expandedFolders = new Set(expandedFolders);
        
        currentFolderPath = folderPath; // Set as current folder
        selectedFolderPath = folderPath; // Set as selected folder
      } else {
        fileStore.setError('Folder creation is only available in filesystem mode');
      }

    } catch (error: any) {
      fileStore.setError(`Error creating folder: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  async function rescanFiles() {
    if (!$fileStore.folderHandle) return;
    
    const files: FileEntry[] = [];
    const folders = new Set<string>();
    await scanDirectory($fileStore.folderHandle, '', files, folders);
    files.sort((a, b) => a.path.localeCompare(b.path));
    fileStore.setFiles(files);
    allFolders = folders;
  }

  async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path: string, files: FileEntry[], folders: Set<string>) {
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.chords')) {
        files.push({
          name: entry.name,
          path: entryPath,
          handle: entry as FileSystemFileHandle,
        });
      } else if (entry.kind === 'directory') {
        folders.add(entryPath);
        await scanDirectory(entry as FileSystemDirectoryHandle, entryPath, files, folders);
      }
    }
  }

  async function addNewFile(folderPath: string = '') {
    const prompt_message = $fileStore.storageMode === 'filesystem' 
      ? 'Enter file name (folder/file for folders, folder/ for empty folder):'
      : 'Enter file name (will be saved as .chords):';
    
    const input = prompt(prompt_message);
    if (!input) return;

    // Check if this is just a folder creation (ends with /)
    if (input.endsWith('/')) {
      if ($fileStore.storageMode !== 'filesystem') {
        fileStore.setError('Folder creation is only available in filesystem mode');
        return;
      }
      const folderPath = input.slice(0, -1);
      if (!folderPath) {
        fileStore.setError('Invalid folder name');
        return;
      }
      await createFolderFromPath(folderPath);
      return;
    }

    // Parse the input to extract folder path and file name
    const parts = input.split('/');
    const fileName = parts[parts.length - 1];
    const targetFolderPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

    // Check if trying to use folders in browser mode
    if (targetFolderPath && $fileStore.storageMode !== 'filesystem') {
      fileStore.setError('Subfolders are only available in filesystem mode');
      return;
    }

    // Ensure .chords extension
    const fullFileName = fileName.endsWith('.chords') ? fileName : `${fileName}.chords`;
    const filePath = targetFolderPath ? `${targetFolderPath}/${fullFileName}` : fullFileName;

    // Check if file already exists
    if ($fileStore.files.some(f => f.path === filePath)) {
      fileStore.setError(`File "${filePath}" already exists`);
      return;
    }

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && $fileStore.folderHandle) {
        // Navigate to the folder and create it if needed
        let targetFolder = $fileStore.folderHandle;
        
        if (targetFolderPath) {
          const folderParts = targetFolderPath.split('/');
          for (const part of folderParts) {
            targetFolder = await targetFolder.getDirectoryHandle(part, { create: true });
            // Add folder to allFolders set if it's new
            const currentPath = folderParts.slice(0, folderParts.indexOf(part) + 1).join('/');
            if (!allFolders.has(currentPath)) {
              allFolders.add(currentPath);
            }
          }
          // Update allFolders
          allFolders = new Set(allFolders);
          
          // Expand parent folders
          if (targetFolderPath) {
            expandedFolders.add(targetFolderPath);
            expandedFolders = new Set(expandedFolders);
          }
        }

        const fileHandle = await targetFolder.getFileHandle(fullFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileConfig.newFileTemplate);
        await writable.close();

        const newFile: FileEntry = {
          name: fullFileName,
          path: filePath,
          handle: fileHandle,
        };

        fileStore.addFile(newFile);
        fileStore.setCurrentFile(newFile);
        fileStore.setCurrentContent(fileConfig.newFileTemplate);
        
        // Expand the folder if we added a file to a subfolder
        if (folderPath) {
          expandedFolders.add(folderPath);
          expandedFolders = new Set(expandedFolders);
        }
      } else {
        // Create file in browser storage (no subfolders in browser mode)
        // Create a copy of the template to avoid reference issues
        const templateContent = String(fileConfig.newFileTemplate);
        await saveBrowserFile(fullFileName, templateContent);
        
        const newFile: FileEntry = {
          name: fullFileName,
          path: fullFileName,
          content: templateContent,
        };

        fileStore.addFile(newFile);
        fileStore.setCurrentFile(newFile);
        fileStore.setCurrentContent(templateContent);
      }

    } catch (error: any) {
      fileStore.setError(`Error creating file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  function startRename(file: FileEntry) {
    editingFilePath = file.path;
    editingValue = file.name;
  }

  function handleKeydown(e: KeyboardEvent, oldPath: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveFileName(oldPath);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editingFilePath = null;
      editingValue = '';
    }
  }

  async function saveFileName(oldPath: string) {
    if (!editingValue.trim() || editingValue === oldPath) {
      editingFilePath = null;
      return;
    }

    const newName = editingValue.endsWith('.chords') ? editingValue : `${editingValue}.chords`;
    const oldFile = $fileStore.files.find(f => f.path === oldPath);
    
    if (!oldFile) {
      editingFilePath = null;
      return;
    }

    // Calculate new path
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');

    // Check if new name already exists
    if ($fileStore.files.some(f => f.path === newPath)) {
      fileStore.setError(`File "${newPath}" already exists`);
      editingFilePath = null;
      return;
    }

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && oldFile.handle) {
        // For filesystem, we need to create new file and delete old one
        const oldFileData = await oldFile.handle.getFile();
        const content = await oldFileData.text();

        // Extract old filename before modifying pathParts
        const oldPathParts = oldPath.split('/');
        const oldFileName = oldPathParts[oldPathParts.length - 1];

        // Get folder path
        const folderPath = pathParts.slice(0, -1).join('/');
        let targetFolder = $fileStore.folderHandle!;
        
        if (folderPath) {
          const parts = folderPath.split('/');
          for (const part of parts) {
            targetFolder = await targetFolder.getDirectoryHandle(part, { create: false });
          }
        }

        // Create new file
        const newHandle = await targetFolder.getFileHandle(newName, { create: true });
        const writable = await newHandle.createWritable();
        await writable.write(content);
        await writable.close();

        // Delete old file using extracted old filename
        await targetFolder.removeEntry(oldFileName);

        // Update store
        const newFile: FileEntry = {
          name: newName,
          path: newPath,
          handle: newHandle,
        };

        fileStore.deleteFile(oldPath);
        fileStore.addFile(newFile);

        if ($fileStore.currentFile?.path === oldPath) {
          fileStore.setCurrentFile(newFile);
          fileStore.setCurrentContent(content);
        }
      } else {
        // Browser mode
        await renameBrowserFile(oldFile.name, newName);
        
        const newFile: FileEntry = {
          name: newName,
          path: newPath,
          content: oldFile.content,
        };

        fileStore.deleteFile(oldPath);
        fileStore.addFile(newFile);

        if ($fileStore.currentFile?.path === oldPath) {
          fileStore.setCurrentFile(newFile);
        }
      }

      editingFilePath = null;
      editingValue = '';

    } catch (error: any) {
      fileStore.setError(`Error renaming file: ${error.message}`);
      editingFilePath = null;
    } finally {
      fileStore.setLoading(false);
    }
  }

  async function deleteFile(file: FileEntry) {
    const confirmed = confirm(`Are you sure you want to delete "${file.path}"?`);
    if (!confirmed) return;

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && file.handle) {
        // Get folder path
        const pathParts = file.path.split('/');
        const folderPath = pathParts.slice(0, -1).join('/');
        let targetFolder = $fileStore.folderHandle!;
        
        if (folderPath) {
          const parts = folderPath.split('/');
          for (const part of parts) {
            targetFolder = await targetFolder.getDirectoryHandle(part, { create: false });
          }
        }

        await targetFolder.removeEntry(file.name);
      } else {
        // Delete from browser storage
        await deleteBrowserFile(file.name);
      }

      // Remove from store
      fileStore.deleteFile(file.path);

    } catch (error: any) {
      fileStore.setError(`Error deleting file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  function isSelected(file: FileEntry): boolean {
    return $fileStore.currentFile?.path === file.path;
  }

  function startRenameFolder(folderPath: string) {
    editingFilePath = folderPath;
    const parts = folderPath.split('/');
    editingValue = parts[parts.length - 1];
  }

  async function saveFolderName(oldPath: string) {
    if (!editingValue.trim() || editingValue === oldPath.split('/').pop()) {
      editingFilePath = null;
      return;
    }

    const newName = editingValue.replace(/\//g, ''); // Remove slashes
    if (!newName) {
      fileStore.setError('Invalid folder name');
      editingFilePath = null;
      return;
    }

    // Calculate new path
    const pathParts = oldPath.split('/');
    const parentPath = pathParts.slice(0, -1).join('/');
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    // Check if new name already exists
    if (allFolders.has(newPath)) {
      fileStore.setError(`Folder "${newPath}" already exists`);
      editingFilePath = null;
      return;
    }

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && $fileStore.folderHandle) {
        // Get parent folder
        let parentFolder = $fileStore.folderHandle;
        if (parentPath) {
          const parts = parentPath.split('/');
          for (const part of parts) {
            parentFolder = await parentFolder.getDirectoryHandle(part, { create: false });
          }
        }

        // Get old folder handle
        const oldFolder = await parentFolder.getDirectoryHandle(pathParts[pathParts.length - 1], { create: false });
        
        // Create new folder
        const newFolder = await parentFolder.getDirectoryHandle(newName, { create: true });
        
        // Move all contents recursively
        await copyDirectoryContents(oldFolder, newFolder);
        
        // Delete old folder
        await parentFolder.removeEntry(pathParts[pathParts.length - 1], { recursive: true });
        
        // Update folders set
        allFolders.delete(oldPath);
        allFolders.add(newPath);
        
        // Update expanded folders
        if (expandedFolders.has(oldPath)) {
          expandedFolders.delete(oldPath);
          expandedFolders.add(newPath);
        }
        
        // Rescan to update file paths
        await rescanFiles();
        
        currentFolderPath = newPath;
      }

      editingFilePath = null;
      editingValue = '';

    } catch (error: any) {
      fileStore.setError(`Error renaming folder: ${error.message}`);
      editingFilePath = null;
    } finally {
      fileStore.setLoading(false);
    }
  }

  async function copyDirectoryContents(sourceDir: FileSystemDirectoryHandle, destDir: FileSystemDirectoryHandle) {
    for await (const entry of sourceDir.values()) {
      if (entry.kind === 'file') {
        const file = await (entry as FileSystemFileHandle).getFile();
        const destFile = await destDir.getFileHandle(entry.name, { create: true });
        const writable = await destFile.createWritable();
        await writable.write(await file.arrayBuffer());
        await writable.close();
      } else if (entry.kind === 'directory') {
        const subDir = await destDir.getDirectoryHandle(entry.name, { create: true });
        await copyDirectoryContents(entry as FileSystemDirectoryHandle, subDir);
      }
    }
  }

  async function deleteFolder(folderPath: string) {
    const confirmed = confirm(`Are you sure you want to delete the folder "${folderPath}" and all its contents?`);
    if (!confirmed) return;

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && $fileStore.folderHandle) {
        // Get parent folder
        const pathParts = folderPath.split('/');
        const parentPath = pathParts.slice(0, -1).join('/');
        let parentFolder = $fileStore.folderHandle;
        
        if (parentPath) {
          const parts = parentPath.split('/');
          for (const part of parts) {
            parentFolder = await parentFolder.getDirectoryHandle(part, { create: false });
          }
        }

        // Delete folder recursively
        await parentFolder.removeEntry(pathParts[pathParts.length - 1], { recursive: true });
        
        // Update folders set
        allFolders.delete(folderPath);
        // Also remove any subfolders
        for (const folder of allFolders) {
          if (folder.startsWith(folderPath + '/')) {
            allFolders.delete(folder);
          }
        }
        allFolders = new Set(allFolders);
        
        // Rescan to update file list
        await rescanFiles();
        
        currentFolderPath = parentPath;
      }

    } catch (error: any) {
      fileStore.setError(`Error deleting folder: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }


</script>

<div class="file-list">
  <div class="file-list-content">
    {#if $fileStore.files.length === 0}
      <div class="empty-state">
        {#if $fileStore.storageMode === 'filesystem'}
          No .chords files found in this folder
        {:else}
          No files yet. Click + to create one!
        {/if}
      </div>
    {:else}
      <FileListTree
        {tree}
        {expandedFolders}
        {editingFilePath}
        {editingValue}
        {selectedFolderPath}
        currentFile={$fileStore.currentFile}
        onToggleFolder={toggleFolder}
        onSelectFile={selectFile}
        onStartRename={startRename}
        onStartRenameFolder={startRenameFolder}
        onDeleteFile={deleteFile}
        onDeleteFolder={deleteFolder}
        onSaveFileName={saveFileName}
        onSaveFolderName={saveFolderName}
        onKeydown={handleKeydown}
      />
    {/if}
  </div>
  
  <FileListFooter
    onAddFile={addNewFile}
  />
</div>

<style>
  .file-list {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background-color: rgba(0, 0, 0, 0.2);
  }

  .file-list-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }

  .empty-state {
    padding: 2rem 1rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }
</style>

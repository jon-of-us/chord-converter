<script lang="ts">
  import { fileStore, type FileEntry } from './fileStore';
  import { saveFolderHandle, loadFolderHandle, clearFolderHandle, loadAllBrowserFiles, deleteBrowserFile } from './indexedDB';
  import { onMount } from 'svelte';
  import DownloadButton from './DownloadButton.svelte';

  let isSupported = false;

  onMount(async () => {
    // Check if File System Access API is supported
    isSupported = 'showDirectoryPicker' in window;
    
    if (!isSupported) {
      // Don't show error immediately - user can still use browser mode
      console.log('File System Access API not supported - browser mode only');
      return;
    }

    // Try to restore previous folder handle
    await restoreFolderHandle();
  });

  async function restoreFolderHandle() {
    try {
      fileStore.setLoading(true);
      const handle = await loadFolderHandle();
      
      if (handle) {
        // Verify we still have permission
        const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
        
        if (permission === 'granted') {
          fileStore.setFolderHandle(handle);
          await loadFilesFromFolder(handle);
          fileStore.setError(null);
        } else if (permission === 'prompt') {
          // Request permission again
          const newPermission = await (handle as any).requestPermission({ mode: 'readwrite' });
          if (newPermission === 'granted') {
            fileStore.setFolderHandle(handle);
            await loadFilesFromFolder(handle);
            fileStore.setError(null);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring folder handle:', error);
      // Silently fail - user will need to select folder manually
    } finally {
      fileStore.setLoading(false);
    }
  }

  async function selectFolder() {
    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      // Request folder access
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      // Check if there are browser files to migrate
      const browserFiles = await loadAllBrowserFiles();
      
      if (browserFiles.length > 0) {
        const shouldMigrate = confirm(
          `You have ${browserFiles.length} file(s) saved in the browser. Would you like to move them to the selected folder?`
        );

        if (shouldMigrate) {
          // Migrate files from browser to folder
          for (const browserFile of browserFiles) {
            try {
              const fileHandle = await handle.getFileHandle(browserFile.name, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(browserFile.content);
              await writable.close();
              
              // Delete from browser storage after successful migration
              await deleteBrowserFile(browserFile.name);
            } catch (fileError: any) {
              console.error(`Error migrating file ${browserFile.name}:`, fileError);
              // Continue with other files
            }
          }
        }
      }

      // Save handle to IndexedDB
      await saveFolderHandle(handle);
      
      // Update store
      fileStore.setFolderHandle(handle);
      
      // Load files
      await loadFilesFromFolder(handle);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled - no error message needed
        console.log('Folder selection cancelled');
      } else {
        fileStore.setError(`Error selecting folder: ${error.message}`);
      }
    } finally {
      fileStore.setLoading(false);
    }
  }

  async function loadFilesFromFolder(handle: FileSystemDirectoryHandle) {
    try {
      const files: FileEntry[] = [];
      
      console.log('Loading files from folder:', handle.name);
      
      await scanDirectory(handle, '', files);
      
      console.log('Total .txt files found:', files.length);
      
      // Sort files alphabetically by path
      files.sort((a, b) => a.name.localeCompare(b.name));
      
      fileStore.setFiles(files);
    } catch (error: any) {
      console.error('Error loading files:', error);
      fileStore.setError(`Error loading files: ${error.message}`);
    }
  }

  async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path: string, files: FileEntry[]) {
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.chords')) {
        console.log('Found file:', entryPath);
        files.push({
          name: entryPath,
          handle: entry as FileSystemFileHandle,
        });
      } else if (entry.kind === 'directory') {
        console.log('Scanning subdirectory:', entryPath);
        await scanDirectory(entry as FileSystemDirectoryHandle, entryPath, files);
      }
    }
  }

  async function disconnectFolder() {
    await clearFolderHandle();
    fileStore.setFolderHandle(null);
    
    // Load browser files after disconnecting
    try {
      const browserFiles = await loadAllBrowserFiles();
      
      if (browserFiles.length > 0) {
        const files: FileEntry[] = browserFiles.map(f => ({
          name: f.name,
          content: f.content
        }));
        
        fileStore.setFiles(files);
        
        // Auto-open first file
        const firstFile = files[0];
        fileStore.setCurrentFile(firstFile);
        fileStore.setCurrentContent(firstFile.content || '');
      } else {
        fileStore.setFiles([]);
        fileStore.setCurrentFile(null);
        fileStore.setCurrentContent('');
      }
    } catch (error) {
      console.error('Error loading browser files:', error);
      fileStore.setFiles([]);
      fileStore.setCurrentFile(null);
      fileStore.setCurrentContent('');
    }
  }
</script>

<div class="folder-picker">
  {#if isSupported}
    <button on:click={selectFolder} disabled={$fileStore.loading}>
      {$fileStore.folderHandle ? 'Change Folder' : 'Connect Folder'}
    </button>
    
    {#if $fileStore.folderHandle}
      <span class="folder-name">{$fileStore.folderHandle.name}</span>
      <span class="file-count">({$fileStore.files.length} files)</span>
      <button on:click={disconnectFolder} class="disconnect-btn" disabled={$fileStore.loading}>
        Disconnect
      </button>
    {/if}
  {/if}
  
  <DownloadButton />
</div>

<style>
  .folder-picker {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  button {
    padding: 0.5rem 1rem;
    background-color: #646cff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  button:hover:not(:disabled) {
    background-color: #535bf2;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .folder-name {
    font-weight: 600;
    color: #646cff;
  }

  .file-count {
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
  }

  .disconnect-btn {
    padding: 0.5rem 1rem;
    background-color: rgba(255, 50, 50, 0.2);
    color: #ff6b6b;
    border: 1px solid #ff6b6b;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .disconnect-btn:hover:not(:disabled) {
    background-color: rgba(255, 50, 50, 0.3);
  }
</style>

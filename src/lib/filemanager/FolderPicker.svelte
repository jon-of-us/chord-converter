<script lang="ts">
  import * as Svelte from 'svelte';
  import { fileStore } from '../stores/fileStore.svelte';
  import * as indexedDB from '../utils/indexedDB';
  import * as fileService from '../services/fileService';
  import * as fileManagerService from '../services/fileManagerService';
  import DownloadButton from './DownloadButton.svelte';
  import Button from '../components/Button.svelte';

  let isSupported = false;

  Svelte.onMount(async () => {
    isSupported = 'showDirectoryPicker' in window;
    
    if (!isSupported) {
      console.log('File System Access API not supported - browser mode only');
      return;
    }

    await restoreFolderHandle();
  });

  async function restoreFolderHandle() {
    try {
      fileStore.setLoading(true);
      const handle = await indexedDB.loadFolderHandle();
      
      if (handle) {
        const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
        
        if (permission === 'granted') {
          fileStore.setFolderHandle(handle);
          await fileManagerService.loadFilesFromFolder(handle);
          fileStore.setError(null);
        } else if (permission === 'prompt') {
          const newPermission = await (handle as any).requestPermission({ mode: 'readwrite' });
          if (newPermission === 'granted') {
            fileStore.setFolderHandle(handle);
            await fileManagerService.loadFilesFromFolder(handle);
            fileStore.setError(null);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring folder handle:', error);
    } finally {
      fileStore.setLoading(false);
    }
  }

  async function selectFolder() {
    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      // Check for browser files to migrate
      const browserFiles = await indexedDB.loadAllBrowserFiles();
      
      if (browserFiles.length > 0) {
        const shouldMigrate = confirm(
          `You have ${browserFiles.length} file(s) saved in the browser. Would you like to move them to the selected folder?`
        );

        if (shouldMigrate) {
          await fileManagerService.migrateBrowserFilesToFolder(handle, browserFiles);
        }
      }

      await indexedDB.saveFolderHandle(handle);
      fileStore.setFolderHandle(handle);
      await fileManagerService.loadFilesFromFolder(handle);
      
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

  async function disconnectFolder() {
    await indexedDB.clearFolderHandle();
    fileStore.setFolderHandle(null);
    
    // Load browser files after disconnecting
    try {
      const files = await fileService.loadBrowserFiles();
      
      if (files.length > 0) {
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
  
  // File input handler for iOS and browsers without drag-and-drop support
  let fileInput: HTMLInputElement;
  
  async function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    try {
      // Process files directly to preserve webkitRelativePath
      const filesToImport: Array<{ path: string; content: string }> = [];
      
      for (const file of Array.from(input.files)) {
        if (file.type === 'text/plain' || file.name.endsWith('.chords')) {
          const content = await file.text();
          // Use webkitRelativePath which preserves folder structure
          const path = (file as any).webkitRelativePath || file.name;
          filesToImport.push({ path, content });
        }
      }
      
      if (filesToImport.length > 0) {
        await fileManagerService.importFilesDirectly(filesToImport);
      }
      
      // Reset input so the same folder can be selected again
      input.value = '';
    } catch (error) {
      // Error already handled in service
    }
  }
  
  function triggerFileInput() {
    fileInput?.click();
  }
</script>

<div class="folder-picker">
  <!-- Hidden file input for iOS and browsers without drag-and-drop -->
  <input
    type="file"
    multiple
    webkitdirectory
    accept=".chords,text/plain"
    bind:this={fileInput}
    onchange={handleFileInput}
    style="display: none;"
  />
  
  {#if !fileStore.folderHandle}
    <div class="top-buttons">
      <Button
        onclick={selectFolder}
        disabled={fileStore.loading || !isSupported}
        title={isSupported ? '' : 'File System Access is only supported in Chrome, Edge, and Opera. Please use one of these browsers to connect a folder.'}
        variant="primary"
        class={!isSupported ? 'unsupported' : ''}
      >
        Connect Folder
      </Button>
      <Button
        onclick={triggerFileInput}
        disabled={fileStore.loading}
        title="Import folder with .chords files"
      >
        Import Folder
      </Button>
    </div>
  {/if}
  
  {#if fileStore.folderHandle}
    <div class="folder-info">
      <span class="folder-name">{fileStore.folderHandle.name}</span>
      <span class="file-count">({fileStore.files.length} files)</span>
    </div>
    
    <div class="folder-actions">
      <Button
        onclick={selectFolder}
        disabled={fileStore.loading}
        title="Change folder"
      >
        Change Folder
      </Button>
      <Button
        onclick={disconnectFolder}
        disabled={fileStore.loading}
        title="Disconnect folder"
      >
        Disconnect
      </Button>
    </div>
  {/if}
  
  <DownloadButton />
</div>

<style>
  .folder-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .top-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .top-buttons :global(.btn) {
    flex: 1;
  }
  
  .top-buttons :global(.btn.unsupported) {
    background-color: #888;
  }

  .folder-info {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    min-width: 0;
  }

  .folder-name {
    font-weight: 600;
    color: #d2d2d2;
    font-size: 24px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-count {
    color: rgba(255, 255, 255, 0.6);
    font-size: 17px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .folder-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .folder-actions :global(.btn) {
    flex: 1;
  }
</style>

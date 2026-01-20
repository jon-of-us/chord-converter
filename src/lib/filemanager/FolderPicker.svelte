<script lang="ts">
  import * as Svelte from 'svelte';
  import { fileStore } from '../stores/fileStore';
  import * as indexedDBModule from '../utils/indexedDB';
  import * as fileService from '../services/fileService';
  import * as fileManagerService from '../services/fileManagerService';
  import DownloadButton from './DownloadButton.svelte';

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
      const handle = await indexedDBModule.loadFolderHandle();
      
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
      const browserFiles = await indexedDBModule.loadAllBrowserFiles();
      
      if (browserFiles.length > 0) {
        const shouldMigrate = confirm(
          `You have ${browserFiles.length} file(s) saved in the browser. Would you like to move them to the selected folder?`
        );

        if (shouldMigrate) {
          await fileManagerService.migrateBrowserFilesToFolder(handle, browserFiles);
        }
      }

      await indexedDBModule.saveFolderHandle(handle);
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
    await indexedDBModule.clearFolderHandle();
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
</script>

<div class="folder-picker">
  {#if !$fileStore.folderHandle}
    <button 
      onclick={selectFolder} 
      disabled={$fileStore.loading || !isSupported}
      title={isSupported ? '' : 'File System Access is only supported in Chrome, Edge, and Opera. Please use one of these browsers to connect a folder.'}
      class:unsupported={!isSupported}
      class="main-btn"
    >
      Connect Folder
    </button>
  {/if}
  
  {#if $fileStore.folderHandle}
    <div class="folder-info">
      <span class="folder-name">{$fileStore.folderHandle.name}</span>
      <span class="file-count">({$fileStore.files.length} files)</span>
    </div>
    
    <div class="folder-actions">
      <button 
        onclick={selectFolder}
        disabled={$fileStore.loading}
        class="folder-action-btn"
        title="Change folder"
      >
        Change Folder
      </button>
      <button 
        onclick={disconnectFolder} 
        class="disconnect-btn" 
        disabled={$fileStore.loading} 
        title="Disconnect folder"
      >
        Disconnect
      </button>
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

  .main-btn {
    padding: 0.4rem 0.75rem;
    background-color: #646cff;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: background-color 0.2s;
    white-space: nowrap;
  }

  .main-btn:hover:not(:disabled) {
    background-color: #535bf2;
  }

  .main-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .main-btn.unsupported {
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

  .folder-action-btn {
    flex: 1;
    padding: 0.4rem 0.75rem;
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .folder-action-btn:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  .folder-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .disconnect-btn {
    flex: 1;
    padding: 0.4rem 0.75rem;
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .disconnect-btn:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  .disconnect-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>

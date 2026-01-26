<script lang="ts">
  import { fileStore } from '../stores/fileStore';
  import * as fileManagerService from '../services/fileManagerService';
  import FileTreeItem from './FileTreeItem.svelte';
  
  // Extract folders from file paths
  let allFolders = $derived.by(() => {
    const folders = new Set<string>();
    for (const file of $fileStore.files) {
      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'));
      }
    }
    return folders;
  });
  
  // Build tree from files and folders
  let tree = $derived(fileManagerService.buildFileTree($fileStore.files, allFolders));
  
  // Drag and drop state
  let isDragging = $state(false);
  
  async function addFile() {
    const input = prompt('Enter file name (or folder/filename for folders, folder/ for empty folder):');
    if (!input) return;
    
    try {
      await fileManagerService.createFile(input);
    } catch (error) {
      // Error already handled in service
    }
  }
  
  async function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    isDragging = true;
  }
  
  function handleDragLeave(e: DragEvent) {
    // Only set to false if we're leaving the container itself, not a child
    if (e.currentTarget === e.target) {
      isDragging = false;
    }
  }
  
  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    
    if (!e.dataTransfer) return;
    
    try {
      await fileManagerService.handleFileDrop(e.dataTransfer);
    } catch (error) {
      // Error already handled in service
    }
  }
</script>

<div 
  class="file-manager"
  class:dragging={isDragging}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="File manager with drag and drop support"
>
  <div class="file-list">
    {#if $fileStore.files.length === 0}
      <div class="empty-state">
        {#if $fileStore.storageMode === 'filesystem'}
          No .chords files found
        {:else}
          No files yet. Click "New +" to create one, or drag & drop .chords files here
        {/if}
      </div>
    {:else}
      <ul class="tree">
        {#each tree as node}
          <FileTreeItem {node} onSelectFile={fileManagerService.selectFile} />
        {/each}
      </ul>
    {/if}
    
    {#if isDragging && $fileStore.storageMode === 'browser'}
      <div class="drop-overlay">
        <div class="drop-message">Drop files or folders here</div>
      </div>
    {/if}
  </div>
  
  <button
    class="add-button"
    onclick={addFile}
    disabled={$fileStore.loading}
    title="Create new file or folder"
  >
    New +
  </button>
</div>

<style>
  .file-manager {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background-color: rgba(0, 0, 0, 0.2);
    position: relative;
    transition: background-color 0.2s;
  }
  
  .file-manager.dragging {
    background-color: rgba(100, 108, 255, 0.1);
  }
  
  .file-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    position: relative;
  }
  
  .empty-state {
    padding: 2rem 1rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }
  
  
  .drop-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(100, 108, 255, 0.2);
    border: 2px dashed #646cff;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
  }
  
  .drop-message {
    font-size: 16px;
    font-weight: 600;
    color: #646cff;
    background-color: rgba(0, 0, 0, 0.8);
    padding: 1rem 2rem;
    border-radius: 8px;
  }
  
  .tree {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .add-button {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    padding: 0.6rem 1rem;
    border-radius: 6px;
    background-color: #646cff;
    color: white;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }
  
  .add-button:hover:not(:disabled) {
    background-color: #535bf2;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
  }
  
  .add-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>

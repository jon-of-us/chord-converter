<script lang="ts">
  import { fileStore } from '../stores/fileStore.svelte';
  import { fileManagerStore } from '../stores/fileManagerStore.svelte';
  import { editorStore } from '../stores/editorStore.svelte';
  import FileTreeItem from './FileTreeItem.svelte';
  
  // Build tree from files
  let tree = $derived(fileManagerStore.buildFileTree());
  
  // Drag and drop state
  let isDragging = $state(false);
  
  // Get current folder context for prompt
  let currentFolderContext = $derived.by(() => {
    const selectedPath = fileManagerStore.selectedPath;
    if (!selectedPath) return 'root';
    
    // Check if it's a file
    const selectedFile = fileStore.files.find(f => f.path === selectedPath);
    if (selectedFile) {
      const parts = selectedFile.path.split('/');
      parts.pop();
      return parts.length > 0 ? parts.join('/') : 'root';
    }
    
    // It's a folder
    return selectedPath;
  });
  
  async function handleSelectFile(path: string) {
    fileManagerStore.selectedPath = path;
    await fileManagerStore.loadSelectedContent();
    editorStore.editedContent = fileManagerStore.cachedContent;
  }
  
  async function addFile() {
    const contextMsg = currentFolderContext === 'root' 
      ? '' 
      : ` in "${currentFolderContext}"`;
    const input = prompt(`Create new file${contextMsg}:\n\nEnter filename, or use:\n- "subfolder/file" to create in subfolder\n- "folder/" to create empty folder`);
    if (!input) return;
    
    const selectedFolderPath = fileManagerStore.getSelectedFolderPath();
    
    try {
      await fileStore.createFile(input, selectedFolderPath);
    } catch (error) {
      // Error already handled in store
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
      await fileStore.handleFileDrop(e.dataTransfer);
    } catch (error) {
      // Error already handled in store
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
    {#if fileStore.files.length === 0}
      <div class="empty-state">
        {#if fileStore.storageMode === 'filesystem'}
          No .chords files found
        {:else}
          No files yet. Click "New +" to create one, or drag & drop .chords files here
        {/if}
      </div>
    {:else}
      <ul class="tree">
        {#each tree as node}
          <FileTreeItem {node} {handleSelectFile} />
        {/each}
      </ul>
    {/if}
    
    {#if isDragging && fileStore.storageMode === 'browser'}
      <div class="drop-overlay">
        <div class="drop-message">Drop files or folders here</div>
      </div>
    {/if}
  </div>
  
  <button
    class="add-button"
    onclick={addFile}
    disabled={fileStore.loading}
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

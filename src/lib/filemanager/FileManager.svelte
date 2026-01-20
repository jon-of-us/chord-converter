<script lang="ts">
  import { fileStore } from '../stores/fileStore';
  import { fileManagerStore } from '../stores/fileManagerStore';
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
  
  async function addFile() {
    const input = prompt('Enter file name (or folder/filename for folders, folder/ for empty folder):');
    if (!input) return;
    
    try {
      await fileManagerService.createFile(input);
    } catch (error) {
      // Error already handled in service
    }
  }
</script>

<div class="file-manager">
  <div class="file-list">
    {#if $fileStore.files.length === 0}
      <div class="empty-state">
        {#if $fileStore.storageMode === 'filesystem'}
          No .chords files found
        {:else}
          No files yet. Click "New +" to create one!
        {/if}
      </div>
    {:else}
      <ul class="tree">
        {#each tree as node}
          <FileTreeItem {node} onSelectFile={fileManagerService.selectFile} />
        {/each}
      </ul>
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
  }
  
  .file-list {
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

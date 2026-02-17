<script lang="ts" module>
  export interface TreeNode {
    name: string;
    path: string;
    isFolder: boolean;
    file?: any;
    children: TreeNode[];
  }
</script>

<script lang="ts">
  import { fileStore, type FileEntry } from '../stores/fileStore.svelte';
  import { fileManagerStore } from '../stores/fileManagerStore.svelte';
  import * as fileManagerService from '../services/fileManagerService';
  import FileTreeItem from './FileTreeItem.svelte';
  
  let { 
    node,
    onSelectFile,
  }: { 
    node: TreeNode;
    onSelectFile: (file: FileEntry) => void;
  } = $props();
  
  let expanded = $derived(fileManagerStore.expandedFolders.has(node.path));
  let isEditing = $derived(fileManagerStore.renamingPath === node.path);
  let editValue = $derived(fileManagerStore.renamingValue);
  let isSelected = $derived(fileManagerStore.selectedPath === node.path);
  
  function handleClick() {
    if (node.isFolder) {
      fileManagerStore.toggleFolder(node.path);
    } else if (node.file) {
      fileManagerStore.select(node.path);
      onSelectFile(node.file);
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fileManagerStore.cancelEditing();
    }
  }
  
  async function saveEdit() {
    if (!editValue.trim() || editValue === node.name) {
      fileManagerStore.cancelEditing();
      return;
    }
    
    try {
      if (node.isFolder) {
        await fileManagerService.renameFolder(node.path, editValue);
      } else if (node.file) {
        await fileManagerService.renameFile(node.file, editValue);
      }
    } catch (error: any) {
      // Error already handled in service
    }
  }
  
  async function handleDelete() {
    const itemType = node.isFolder ? 'folder' : 'file';
    const confirmed = confirm(`Delete ${itemType} "${node.name}"? ${node.isFolder ? 'This will delete all files inside.' : ''}`);
    if (!confirmed) return;
    
    try {
      if (node.isFolder) {
        await fileManagerService.deleteFolder(node.path);
      } else if (node.file) {
        await fileManagerService.deleteFile(node.file);
      }
    } catch (error: any) {
      // Error already handled in service
    }
  }
  
  function startRename() {
    fileManagerStore.startEditing(node.path, node.name);
  }
</script>

<li class:selected={isSelected}>
  {#if isEditing}
    <input
      type="text"
      class="filename-input"
      value={editValue}
      oninput={(e) => fileManagerStore.updateEditingValue(e.currentTarget.value)}
      onkeydown={handleKeydown}
      onblur={() => saveEdit()}
    />
  {:else}
    <div class="item-row">
      <button
        class="item-button"
        class:folder={node.isFolder}
        onclick={handleClick}
        disabled={fileStore.loading}
        title={node.name}
      >
        {#if node.isFolder}
          <span class="folder-icon">{expanded ? '📂' : '📁'}</span>
        {/if}
        <span class="name">{node.name}</span>
      </button>
      
      {#if isSelected}
        <div class="actions">
          <button
            class="action-btn"
            onclick={startRename}
            disabled={fileStore.loading}
            title="Rename"
          >
            ✎
          </button>
          <button
            class="action-btn delete"
            onclick={handleDelete}
            disabled={fileStore.loading}
            title="Delete"
          >
            🗑
          </button>
        </div>
      {/if}
    </div>
  {/if}
  
  {#if node.isFolder && expanded && node.children.length > 0}
    <ul class="nested">
      {#each node.children as child}
        <FileTreeItem node={child} {onSelectFile} />
      {/each}
    </ul>
  {/if}
</li>

<style>
  li {
    display: flex;
    flex-direction: column;
    border-left: 2px solid transparent;
    transition: all 0.2s;
  }
  
  li.selected {
    background-color: rgba(100, 108, 255, 0.15);
    border-left-color: #646cff;
  }
  
  li:hover:not(.selected) {
    background-color: rgba(255, 255, 255, 0.01);
  }
  
  .item-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
  }
  
  .item-button {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.87);
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
    min-width: 0; /* Allow text truncation */
  }
  
  .item-button.folder {
    font-weight: 500;
  }
  
  .item-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  .folder-icon {
    font-size: 16px;
  }
  
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .actions {
    display: flex;
    /* gap: 0.25rem; */
    padding: 0.25rem;
    flex-shrink: 0;
  }
  
  .action-btn {
    padding: 0.4rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 16px;
    transition: color 0.2s;
  }
  
  .action-btn:hover:not(:disabled) {
    color: #646cff;
  }
  
  .action-btn.delete:hover:not(:disabled) {
    color: #ff6b6b;
  }
  
  .action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  .filename-input {
    flex: 1;
    padding: 0.75rem 1rem;
    background-color: rgba(255, 255, 255, 0.1);
    /* border: 1px solid #646cff; */
    color: rgba(255, 255, 255, 0.87);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    margin: 0.25rem 0.5rem;
    /* border-radius: 3px; */
  }
  
  .nested {
    list-style: none;
    padding-left: 1rem;
    margin: 0;
  }
</style>

<script lang="ts">
  import { fileStore, type FileEntry } from '../stores/fileStore';
  import { fileManagerStore } from '../stores/fileManagerStore';
  import * as fileService from '../services/fileService';
  import { fileConfig } from '../config';
  import FileTreeItem, { type TreeNode } from './FileTreeItem.svelte';
  
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
  let tree = $derived(buildTree($fileStore.files, allFolders));
  
  function buildTree(files: FileEntry[], folders: Set<string>): TreeNode[] {
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
  
  async function selectFile(file: FileEntry) {
    try {
      fileStore.setLoading(true);
      fileStore.setError(null);
      
      const content = await fileService.readFile(file);
      
      fileStore.setCurrentFile(file);
      fileStore.setCurrentContent(content);
    } catch (error: any) {
      fileStore.setError(`Error reading file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }
  
  async function addFile() {
    const input = prompt('Enter file name:');
    if (!input) return;
    
    const fileName = input.endsWith('.chords') ? input : `${input}.chords`;
    
    if ($fileStore.files.some(f => f.path === fileName)) {
      fileStore.setError(`File "${fileName}" already exists`);
      return;
    }
    
    try {
      fileStore.setLoading(true);
      fileStore.setError(null);
      
      const newFile = await fileService.createFile(
        fileName,
        '',
        $fileStore.folderHandle || undefined
      );
      
      fileStore.addFile(newFile);
      fileStore.setCurrentFile(newFile);
      fileStore.setCurrentContent(fileConfig.newFileTemplate);
    } catch (error: any) {
      fileStore.setError(`Error creating file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
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
          No files yet. Click + to create one!
        {/if}
      </div>
    {:else}
      <ul class="tree">
        {#each tree as node}
          <FileTreeItem {node} onSelectFile={selectFile} />
        {/each}
      </ul>
    {/if}
  </div>
  
  <div class="footer">
    <button
      class="add-button"
      onclick={addFile}
      disabled={$fileStore.loading}
      title="Create new file"
    >
      +
    </button>
  </div>
</div>

<style>
  .file-manager {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background-color: rgba(0, 0, 0, 0.2);
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
  
  .footer {
    display: flex;
    justify-content: center;
    padding: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0, 0, 0, 0.2);
  }
  
  .add-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #646cff;
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }
  
  .add-button:hover:not(:disabled) {
    background-color: #535bf2;
  }
  
  .add-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>

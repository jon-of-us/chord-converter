<script lang="ts">
  import type { TreeNode } from './FileList.svelte';
  import { fileStore } from './fileStore';

  interface Props {
    tree: TreeNode[];
    expandedFolders: Set<string>;
    editingFilePath: string | null;
    editingValue: string;
    selectedFolderPath: string | null;
    currentFile: any;
    onToggleFolder: (path: string) => void;
    onSelectFile: (file: any) => void;
    onStartRename: (file: any) => void;
    onStartRenameFolder: (path: string) => void;
    onDeleteFile: (file: any) => void;
    onDeleteFolder: (path: string) => void;
    onSaveFileName: (oldPath: string) => void;
    onSaveFolderName: (oldPath: string) => void;
    onKeydown: (e: KeyboardEvent, path: string) => void;
    onFolderKeydown?: (e: KeyboardEvent, path: string) => void;
  }

  let {
    tree,
    expandedFolders,
    editingFilePath,
    editingValue,
    selectedFolderPath,
    currentFile,
    onToggleFolder,
    onSelectFile,
    onStartRename,
    onStartRenameFolder,
    onDeleteFile,
    onDeleteFolder,
    onSaveFileName,
    onSaveFolderName,
    onKeydown,
    onFolderKeydown,
  }: Props = $props();

  function isSelected(file: any): boolean {
    return currentFile?.path === file.path;
  }

  function handleFolderKeydown(e: KeyboardEvent, path: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveFolderName(path);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editingFilePath = null;
    }
  }
</script>

<ul class="tree">
  {#each tree as node}
    {#if node.isFolder}
      <li class="folder-item">
        <div class="folder-content">
          {#if editingFilePath === node.path}
            <input
              type="text"
              class="filename-input"
              bind:value={editingValue}
              onkeydown={(e) => handleFolderKeydown(e, node.path)}
              onblur={() => onSaveFolderName(node.path)}
            />
          {:else}
            <button class="folder-button" onclick={() => onToggleFolder(node.path)}>
              <span class="folder-icon">{node.expanded ? '📂' : '📁'}</span>
              <span class="folder-name">{node.name}</span>
            </button>
            {#if $fileStore.storageMode === 'filesystem' && selectedFolderPath === node.path}
              <div class="file-actions">
                <button
                  class="rename-button"
                  onclick={() => onStartRenameFolder(node.path)}
                  disabled={$fileStore.loading}
                  title="Rename folder"
                >
                  ✎
                </button>
                <button
                  class="delete-button"
                  onclick={() => onDeleteFolder(node.path)}
                  disabled={$fileStore.loading}
                  title="Delete folder"
                >
                  🗑
                </button>
              </div>
            {/if}
          {/if}
        </div>
        {#if node.expanded && node.children.length > 0}
          <ul class="tree nested">
            {#each node.children as child}
              {#if child.isFolder}
                <!-- Nested folder -->
                <li class="folder-item">
                  <div class="folder-content">
                    {#if editingFilePath === child.path}
                      <input
                        type="text"
                        class="filename-input"
                        bind:value={editingValue}
                        onkeydown={(e) => handleFolderKeydown(e, child.path)}
                        onblur={() => onSaveFolderName(child.path)}
                      />
                    {:else}
                      <button class="folder-button nested" onclick={() => onToggleFolder(child.path)}>
                        <span class="folder-icon">{child.expanded ? '📂' : '📁'}</span>
                        <span class="folder-name">{child.name}</span>
                      </button>
                      {#if $fileStore.storageMode === 'filesystem' && selectedFolderPath === child.path}
                        <div class="file-actions">
                          <button
                            class="rename-button"
                            onclick={() => onStartRenameFolder(child.path)}
                            disabled={$fileStore.loading}
                            title="Rename folder"
                          >
                            ✎
                          </button>
                          <button
                          class="delete-button"
                          onclick={() => onDeleteFolder(child.path)}
                          disabled={$fileStore.loading}
                          title="Delete folder"
                        >
                          🗑
                        </button>
                      </div>
                    {/if}
                  {/if}
                </div>
                {#if child.expanded && child.children.length > 0}
                    <ul class="tree nested">
                      {#each child.children as file}
                        {#if !file.isFolder && file.file}
                          <li class:selected={isSelected(file.file)}>
                            {#if editingFilePath === file.path}
                              <input
                                type="text"
                                class="filename-input"
                                bind:value={editingValue}
                                onkeydown={(e) => onKeydown(e, file.path)}
                                onblur={() => onSaveFileName(file.path)}
                              />
                            {:else}
                              <button
                                class="file-button nested"
                                onclick={() => onSelectFile(file.file)}
                                disabled={$fileStore.loading}
                              >
                                {file.name}
                              </button>
                              {#if isSelected(file.file)}
                                <div class="file-actions">
                                  <button
                                    class="rename-button"
                                    onclick={() => onStartRename(file.file)}
                                    disabled={$fileStore.loading}
                                    title="Rename file"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    class="delete-button"
                                    onclick={() => onDeleteFile(file.file)}
                                    disabled={$fileStore.loading}
                                    title="Delete file"
                                  >
                                    🗑
                                  </button>
                                </div>
                              {/if}
                            {/if}
                          </li>
                        {/if}
                      {/each}
                    </ul>
                  {/if}
                </li>
              {:else if child.file}
                <!-- File in subfolder -->
                <li class:selected={isSelected(child.file)}>
                  {#if editingFilePath === child.path}
                    <input
                      type="text"
                      class="filename-input"
                      bind:value={editingValue}
                      onkeydown={(e) => onKeydown(e, child.path)}
                      onblur={() => onSaveFileName(child.path)}
                    />
                  {:else}
                    <button
                      class="file-button nested"
                      onclick={() => onSelectFile(child.file)}
                      disabled={$fileStore.loading}
                    >
                      {child.name}
                    </button>
                    {#if isSelected(child.file)}
                      <div class="file-actions">
                        <button
                          class="rename-button"
                          onclick={() => onStartRename(child.file)}
                          disabled={$fileStore.loading}
                          title="Rename file"
                        >
                          ✎
                        </button>
                        <button
                          class="delete-button"
                          onclick={() => onDeleteFile(child.file)}
                          disabled={$fileStore.loading}
                          title="Delete file"
                        >
                          🗑
                        </button>
                      </div>
                    {/if}
                  {/if}
                </li>
              {/if}
            {/each}
          </ul>
        {/if}
      </li>
    {:else if node.file}
      <!-- Root level file -->
      <li class:selected={isSelected(node.file)}>
        {#if editingFilePath === node.path}
          <input
            type="text"
            class="filename-input"
            bind:value={editingValue}
            onkeydown={(e) => onKeydown(e, node.path)}
            onblur={() => onSaveFileName(node.path)}
          />
        {:else}
          <button
            class="file-button"
            onclick={() => onSelectFile(node.file)}
            disabled={$fileStore.loading}
          >
            {node.name}
          </button>
          {#if isSelected(node.file)}
            <div class="file-actions">
              <button
                class="rename-button"
                onclick={() => onStartRename(node.file)}
                disabled={$fileStore.loading}
                title="Rename file"
              >
                ✎
              </button>
              <button
                class="delete-button"
                onclick={() => onDeleteFile(node.file)}
                disabled={$fileStore.loading}
                title="Delete file"
              >
                🗑
              </button>
            </div>
          {/if}
        {/if}
      </li>
    {/if}
  {/each}
</ul>

<style>
  .tree {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .tree.nested {
    padding-left: 1rem;
  }

  li {
    display: flex;
    align-items: center;
    border-left: 2px solid transparent;
    transition: all 0.2s;
  }

  li.selected {
    background-color: rgba(100, 108, 255, 0.15);
    border-left-color: #646cff;
  }

  li:hover:not(.selected):not(.folder-item) {
    background-color: rgba(255, 255, 255, 0.05);
    border-left-color: rgba(100, 108, 255, 0.5);
  }

  .folder-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .folder-content {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .folder-button {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.87);
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .folder-button.nested {
    padding-left: 0.5rem;
  }

  .folder-button:hover {
    background-color: rgba(255, 255, 255, 0.03);
  }

  .folder-icon {
    font-size: 16px;
  }

  .folder-name {
    flex: 1;
  }

  .file-button {
    flex: 1;
    padding: 0.75rem 0.5rem 0.75rem 1rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.87);
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .file-button.nested {
    padding-left: 0.5rem;
  }

  li.selected .file-button {
    font-weight: 500;
  }

  .file-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .file-actions {
    display: flex;
    gap: 0.25rem;
    margin-right: 0.5rem;
  }

  .rename-button,
  .delete-button {
    padding: 0.5rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 16px;
    transition: color 0.2s;
  }

  .rename-button:hover:not(:disabled) {
    color: #646cff;
  }

  .delete-button:hover:not(:disabled) {
    color: #ff6b6b;
  }

  .rename-button:disabled,
  .delete-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .filename-input {
    flex: 1;
    padding: 0.75rem 1rem;
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid #646cff;
    color: rgba(255, 255, 255, 0.87);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    margin: 0.25rem 0.5rem;
    border-radius: 3px;
  }
</style>

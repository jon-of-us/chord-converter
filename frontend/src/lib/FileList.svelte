<script lang="ts">
  import { fileStore, type FileEntry } from './fileStore';
  import { loadBrowserFile, saveBrowserFile, renameBrowserFile, deleteBrowserFile } from './indexedDB';
  import { fileConfig } from './config';

  let editingFileName: string | null = null;
  let editingValue = '';

  async function selectFile(file: FileEntry) {
    try {
      fileStore.setLoading(true);
      fileStore.setError(null);
      
      let content = '';
      
      if ($fileStore.storageMode === 'filesystem' && file.handle) {
        // Read from filesystem
        const fileData = await file.handle.getFile();
        content = await fileData.text();
      } else {
        // Read from browser storage
        content = file.content || '';
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

  async function addNewFile() {
    const fileName = prompt('Enter file name (will be saved as .chords):');
    if (!fileName) return;

    // Ensure .chords extension
    const fullFileName = fileName.endsWith('.chords') ? fileName : `${fileName}.chords`;

    // Check if file already exists
    if ($fileStore.files.some(f => f.name === fullFileName)) {
      fileStore.setError(`File "${fullFileName}" already exists`);
      return;
    }

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && $fileStore.folderHandle) {
        // Create file in filesystem
        const fileHandle = await $fileStore.folderHandle.getFileHandle(fullFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileConfig.newFileTemplate);
        await writable.close();

        const newFile: FileEntry = {
          name: fullFileName,
          handle: fileHandle,
        };

        fileStore.addFile(newFile);
        fileStore.setCurrentFile(newFile);
        fileStore.setCurrentContent(fileConfig.newFileTemplate);
      } else {
        // Create file in browser storage
        await saveBrowserFile(fullFileName, fileConfig.newFileTemplate);
        
        const newFile: FileEntry = {
          name: fullFileName,
          content: fileConfig.newFileTemplate,
        };

        fileStore.addFile(newFile);
        fileStore.setCurrentFile(newFile);
        fileStore.setCurrentContent(fileConfig.newFileTemplate);
      }
      
    } catch (error: any) {
      fileStore.setError(`Error creating file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  function startEditingFileName(file: FileEntry) {
    editingFileName = file.name;
    editingValue = file.name.replace(/\.chords$/, '');
  }

  async function saveFileName(oldName: string) {
    if (!editingValue.trim()) {
      editingFileName = null;
      return;
    }

    const newName = editingValue.endsWith('.chords') ? editingValue : `${editingValue}.chords`;
    
    if (newName === oldName) {
      editingFileName = null;
      return;
    }

    // Check if new name already exists
    if ($fileStore.files.some(f => f.name === newName)) {
      fileStore.setError(`File "${newName}" already exists`);
      editingFileName = null;
      return;
    }

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem') {
        // In filesystem mode, we need to create new file and delete old one
        const oldFile = $fileStore.files.find(f => f.name === oldName);
        if (!oldFile || !oldFile.handle) return;

        // Read old content
        const fileData = await oldFile.handle.getFile();
        const content = await fileData.text();

        // Create new file
        if (!$fileStore.folderHandle) return;
        const newHandle = await $fileStore.folderHandle.getFileHandle(newName, { create: true });
        const writable = await newHandle.createWritable();
        await writable.write(content);
        await writable.close();

        // Remove old file (Note: can't actually delete from filesystem with this API)
        // Just update the list
        const newFile: FileEntry = {
          name: newName,
          handle: newHandle,
        };

        fileStore.updateFile(oldName, newFile);
        if ($fileStore.currentFile?.name === oldName) {
          fileStore.setCurrentFile(newFile);
        }
      } else {
        // Rename in browser storage
        await renameBrowserFile(oldName, newName);
        
        const oldFile = $fileStore.files.find(f => f.name === oldName);
        const newFile: FileEntry = {
          name: newName,
          content: oldFile?.content || '',
        };

        fileStore.updateFile(oldName, newFile);
        if ($fileStore.currentFile?.name === oldName) {
          fileStore.setCurrentFile(newFile);
        }
      }

      editingFileName = null;
    } catch (error: any) {
      fileStore.setError(`Error renaming file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  function cancelEditing() {
    editingFileName = null;
    editingValue = '';
  }

  function handleKeydown(event: KeyboardEvent, oldName: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveFileName(oldName);
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  async function deleteFile(file: FileEntry) {
    const confirmDelete = confirm(`Are you sure you want to delete "${file.name}"?`);
    if (!confirmDelete) return;

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      if ($fileStore.storageMode === 'filesystem' && file.handle && $fileStore.folderHandle) {
        // Note: File System Access API doesn't support deleting files directly
        // We can only remove it from the folder handle
        try {
          await $fileStore.folderHandle.removeEntry(file.name);
        } catch (error: any) {
          // If removeEntry fails, just remove from our list
          console.warn('Could not remove file from filesystem:', error);
        }
      } else {
        // Delete from browser storage
        await deleteBrowserFile(file.name);
      }

      // Remove from store
      fileStore.deleteFile(file.name);

    } catch (error: any) {
      fileStore.setError(`Error deleting file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  function isSelected(file: FileEntry): boolean {
    return $fileStore.currentFile?.name === file.name;
  }
</script>

<div class="file-list">
  <div class="file-list-header">
    <strong>Files</strong>
    <button class="add-file-btn" on:click={addNewFile} disabled={$fileStore.loading} title="Add new file">
      +
    </button>
  </div>
  
  {#if $fileStore.files.length === 0}
    <div class="empty-state">
      {#if $fileStore.storageMode === 'filesystem'}
        No .chords files found in this folder
      {:else}
        No files yet. Click + to create one!
      {/if}
    </div>
  {:else}
    <ul>
      {#each $fileStore.files as file}
        <li class:selected={isSelected(file)}>
          {#if editingFileName === file.name}
            <input
              type="text"
              class="filename-input"
              bind:value={editingValue}
              on:keydown={(e) => handleKeydown(e, file.name)}
              on:blur={() => saveFileName(file.name)}
            />
          {:else}
            <button
              class="file-button"
              on:click={() => selectFile(file)}
              disabled={$fileStore.loading}
            >
              {file.name}
            </button>
            <div class="file-actions">
              <button
                class="rename-button"
                on:click={() => startEditingFileName(file)}
                title="Rename file"
                disabled={$fileStore.loading}
              >
                ✎
              </button>
              <button
                class="delete-button"
                on:click={() => deleteFile(file)}
                title="Delete file"
                disabled={$fileStore.loading}
              >
                🗑
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .file-list {
    display: flex;
    flex-direction: column;
    width: 300px;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.03);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    overflow-y: auto;
  }

  .file-list-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: sticky;
    top: 0;
    background-color: rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .add-file-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    background-color: #646cff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-file-btn:hover:not(:disabled) {
    background-color: #535bf2;
  }

  .add-file-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-state {
    padding: 2rem 1rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    align-items: center;
    border-left: 3px solid transparent;
    transition: all 0.2s;
  }

  li.selected {
    background-color: rgba(100, 108, 255, 0.15);
    border-left-color: #646cff;
  }

  li:hover:not(.selected) {
    background-color: rgba(255, 255, 255, 0.05);
    border-left-color: rgba(100, 108, 255, 0.5);
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

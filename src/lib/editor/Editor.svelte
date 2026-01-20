<script lang="ts">
  import { onMount } from 'svelte';
  import EditorView from './view/EditorView.svelte';
  import { editorStore, hasChanges } from '../stores/editorStore';
  import { fileStore } from '../stores/fileStore';
  import * as fileService from '../services/fileService';
  import * as metadataService from '../services/metadataService';
  
  let isSaving = $state(false);
  let saveSuccess = $state(false);
  let editedContent = $state('');
  let previousViewMode = $state($editorStore.viewMode);
  let lastLoadedFilePath = $state<string | null>(null);
  
  // Sync content when file changes
  $effect(() => {
    const currentFile = $fileStore.currentFile;
    if (currentFile && currentFile.path !== lastLoadedFilePath) {
      loadFileContent(currentFile);
      lastLoadedFilePath = currentFile.path;
    } else if (!currentFile) {
      editorStore.reset();
      editedContent = '';
      lastLoadedFilePath = null;
    }
  });
  
  // When switching to structure/chords view, ensure numeric key
  $effect(() => {
    const viewMode = $editorStore.viewMode;
    if ((viewMode === 'structure' || viewMode === 'chords') && 
        previousViewMode === 'text' && 
        $fileStore.currentFile) {
      updateKeyMetadataIfNeeded();
    }
    previousViewMode = viewMode;
  });
  
  async function loadFileContent(file: any) {
    try {
      fileStore.setLoading(true);
      const content = await fileService.readFile(file);
      
      // Ensure numeric key and get key number
      const keyResult = metadataService.ensureNumericKey(content);
      const finalContent = keyResult.updated ? keyResult.content : content;
      
      // If key was updated, save it immediately
      if (keyResult.updated) {
        await fileService.saveFile(file, finalContent);
        fileStore.setCurrentContent(finalContent);
      } else {
        fileStore.setCurrentContent(content);
      }
      
      editorStore.loadContent(finalContent, keyResult.keyNumber);
      editedContent = finalContent;
    } catch (error: any) {
      fileStore.setError(`Error loading file: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }
  
  async function updateKeyMetadataIfNeeded() {
    if (!editedContent) return;
    
    try {
      const keyResult = metadataService.ensureNumericKey(editedContent);
      if (keyResult.updated) {
        editedContent = keyResult.content;
        editorStore.setEditedContent(keyResult.content);
        editorStore.setKeyNumber(keyResult.keyNumber);
        await saveFile();
      } else {
        editorStore.setKeyNumber(keyResult.keyNumber);
      }
    } catch (error: any) {
      console.error('Error updating key metadata:', error);
    }
  }
  
  async function saveFile() {
    if (!$fileStore.currentFile || !$hasChanges) return;
    
    try {
      isSaving = true;
      fileStore.setError(null);
      saveSuccess = false;
      
      await fileService.saveFile($fileStore.currentFile, editedContent);
      
      fileStore.setCurrentContent(editedContent);
      editorStore.setLastSavedContent(editedContent);
      
      saveSuccess = true;
      setTimeout(() => { saveSuccess = false; }, 2000);
    } catch (error: any) {
      fileStore.setError(`Error saving file: ${error.message}`);
    } finally {
      isSaving = false;
    }
  }
  
  async function transposeUp() {
    if (!editedContent) return;
    
    try {
      const result = metadataService.transposeKey(editedContent, 7);
      editedContent = result.content;
      editorStore.setEditedContent(result.content);
      editorStore.setKeyNumber(result.keyNumber);
      await saveFile();
    } catch (error: any) {
      console.error('Error transposing:', error);
    }
  }
  
  async function transposeDown() {
    if (!editedContent) return;
    
    try {
      const result = metadataService.transposeKey(editedContent, -7);
      editedContent = result.content;
      editorStore.setEditedContent(result.content);
      editorStore.setKeyNumber(result.keyNumber);
      await saveFile();
    } catch (error: any) {
      console.error('Error transposing:', error);
    }
  }
  
  // Keyboard shortcuts
  onMount(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveFile();
      }
    }
    
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
  
  // Expose methods for ControlsSidebar
  export function save() { saveFile(); }
  export function transpose(direction: 'up' | 'down') {
    if (direction === 'up') transposeUp();
    else transposeDown();
  }
  export function getSaveState() {
    return { isSaving, saveSuccess, hasChanges: $hasChanges };
  }
</script>

<div class="editor">
  {#if $fileStore.currentFile}
    <EditorView bind:content={editedContent} />
  {:else}
    <div class="no-file-selected">
      <p>Select a file to start editing</p>
    </div>
  {/if}
  
  {#if $fileStore.error}
    <div class="error-message">
      {$fileStore.error}
      <button onclick={() => fileStore.setError(null)}>Dismiss</button>
    </div>
  {/if}
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    position: relative;
    width: 100%;
  }
  
  .no-file-selected {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    color: rgba(255, 255, 255, 0.5);
    font-size: 16px;
  }
  
  .error-message {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(244, 67, 54, 0.9);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 80%;
    animation: slideUp 0.3s;
  }
  
  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  
  .error-message button {
    padding: 0.25rem 0.75rem;
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s;
  }
  
  .error-message button:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
</style>

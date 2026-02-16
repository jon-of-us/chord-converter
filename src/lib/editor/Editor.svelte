<script lang="ts">
  import * as Svelte from 'svelte';
  import EditorView from './view/EditorView.svelte';
  import { editorStore, hasChanges } from '../stores/editorStore';
  import { fileStore } from '../stores/fileStore';
  import * as editorService from '../services/editorService';
  
  let editedContent = $state('');
  let lastLoadedFilePath = $state<string | null>(null);
  
  // Sync content when file changes
  $effect(() => {
    const currentFile = $fileStore.currentFile;
    if (currentFile && currentFile.path !== lastLoadedFilePath) {
      editorService.loadFile(currentFile);
      lastLoadedFilePath = currentFile.path;
    } else if (!currentFile) {
      editorStore.reset();
      editedContent = '';
      lastLoadedFilePath = null;
    }
  });
  
  // Sync editedContent from store
  $effect(() => {
    editedContent = $editorStore.editedContent;
  });
  
  // Sync editedContent changes back to store
  $effect(() => {
    if (editedContent !== $editorStore.editedContent) {
      editorStore.setEditedContent(editedContent);
    }
  });
  
  // Keyboard shortcuts
  Svelte.onMount(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        const currentFile = $fileStore.currentFile;
        const hasChangesValue = $hasChanges;
        if (currentFile && hasChangesValue) {
          editorService.saveFile(currentFile, editedContent);
        }
      }
    }
    
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
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

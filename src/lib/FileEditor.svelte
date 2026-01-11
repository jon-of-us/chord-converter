<script lang="ts" module>
  export interface EditorControls {
    viewMode: 'text' | 'structure' | 'chords';
    zoomLevel: number;
    isAutoscrolling: boolean;
    autoscrollSpeed: number;
    hasChanges: boolean;
    isSaving: boolean;
    saveSuccess: boolean;
    setViewMode: (mode: 'text' | 'chords') => void;
    zoomIn: () => void;
    zoomOut: () => void;
    toggleAutoscroll: () => void;
    increaseAutoscrollSpeed: () => void;
    decreaseAutoscrollSpeed: () => void;
    transposeUp: () => void;
    transposeDown: () => void;
    saveFile: () => void;
  }
</script>

<script lang="ts">
  import { fileStore } from './fileStore';
  import { saveBrowserFile } from './indexedDB';
  import ChordView from './chords/ChordView.svelte';
  import { themeStore } from './themeStore';
  import { editorConfig } from './config';
  import { parseMetadata, serializeWithMetadata } from './chordFileUtils';
  import * as KeyUtils from './chords/keyUtils';

  let { controls = $bindable() }: { controls?: EditorControls } = $props();

  let editedContent = $state('');
  let isSaving = $state(false);
  let saveSuccess = $state(false);
  let lastLoadedContent = $state('');
  let viewMode = $state<'text' | 'structure' | 'chords'>('text');
  let zoomLevel = $state(editorConfig.defaultZoom);
  let isAutoscrolling = $state(false);
  let autoscrollSpeed = $state(editorConfig.defaultAutoscrollSpeed);
  let autoscrollAnimationId: number | null = null;
  let scrollAccumulator = 0;
  let textareaRef = $state<HTMLTextAreaElement>();
  let previousViewMode = $state<'text' | 'structure' | 'chords'>('text');
  let key = $state(0);

  // Only sync when currentContent actually changes (new file loaded or saved)
  $effect(() => {
    if ($fileStore.currentContent !== lastLoadedContent) {
      editedContent = $fileStore.currentContent;
      lastLoadedContent = $fileStore.currentContent;
    }
  });

  let hasChanges = $derived(editedContent !== $fileStore.currentContent);

  // Expose controls to parent
  $effect(() => {
    if (controls !== undefined) {
      controls.viewMode = viewMode;
      controls.zoomLevel = zoomLevel;
      controls.isAutoscrolling = isAutoscrolling;
      controls.autoscrollSpeed = autoscrollSpeed;
      controls.hasChanges = hasChanges;
      controls.isSaving = isSaving;
      controls.saveSuccess = saveSuccess;
      controls.setViewMode = (mode) => { viewMode = mode; };
      controls.zoomIn = zoomIn;
      controls.zoomOut = zoomOut;
      controls.toggleAutoscroll = toggleAutoscroll;
      controls.increaseAutoscrollSpeed = increaseAutoscrollSpeed;
      controls.decreaseAutoscrollSpeed = decreaseAutoscrollSpeed;
      controls.transposeUp = transposeUp;
      controls.transposeDown = transposeDown;
      controls.saveFile = saveFile;
    }
  });

  // When switching to structure or chords view, update key metadata if needed
  $effect(() => {
    if ((viewMode === 'structure' || viewMode === 'chords') && previousViewMode === 'text' && $fileStore.currentFile) {
      updateKeyMetadataIfNeeded();
    }
    previousViewMode = viewMode;
  });

  // When a new file is opened/switched, update key metadata if we're already in structure/chord view
  $effect(() => {
    if ($fileStore.currentFile && (viewMode === 'structure' || viewMode === 'chords')) {
      updateKeyMetadataIfNeeded();
    }
  });

  async function updateKeyMetadataIfNeeded() {
    if (!$fileStore.currentFile || !editedContent) return;

    try {
      const result = parseMetadata(editedContent);
      let shouldUpdate = false;
      let updatedContent = editedContent;
      let keyNumber: number | null = null;

      // Check if the current key is already in numeric format (0-11)
      const currentKeyIsNumeric = result.metadata.key && 
        /^\d+$/.test(result.metadata.key.trim()) &&
        parseInt(result.metadata.key.trim()) >= 0 && 
        parseInt(result.metadata.key.trim()) <= 11;

      // Only add/update key if it's not already in valid numeric format
      if (currentKeyIsNumeric) {
        keyNumber = parseInt(result.metadata.key.trim());
      } else {
        // If no valid key exists, use detected key
        if (result.specifiedKey === null) {
          keyNumber = result.detectedKey;
          const numericKey = (
            result.detectedKey != null ? result.detectedKey : 0
          ).toString();
          result.metadata.key = numericKey;
          updatedContent = serializeWithMetadata(result.metadata, result.contentWithoutMetadata);
          shouldUpdate = true;
        } else { // If key exists but is in non-numeric format (A, Am, C Major, etc.), convert it
          keyNumber = result.specifiedKey;
          const numericKey = result.specifiedKey.toString();
          result.metadata.key = numericKey;
          updatedContent = serializeWithMetadata(result.metadata, result.contentWithoutMetadata);
          shouldUpdate = true;
        }
      } 
  
      // Update the content if changes were made
      if (shouldUpdate) {
        editedContent = updatedContent;
        // Update the store so hasChanges becomes true
        fileStore.setCurrentContent($fileStore.currentContent);
        // Save the file with the updated metadata
        await saveUpdatedContent(updatedContent);
      }

      // set currentTransposeKey based on the specified key
      key = keyNumber!

    } catch (error: any) {
      console.error('Error updating key metadata:', error);
    }
  }

  async function saveUpdatedContent(content: string) {
    if (!$fileStore.currentFile) return;

    try {
      if ($fileStore.storageMode === 'filesystem' && $fileStore.currentFile.handle) {
        // Save to filesystem
        const writable = await $fileStore.currentFile.handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        // Save to browser storage
        await saveBrowserFile($fileStore.currentFile.name, content);
        
        // Update file entry in store
        fileStore.updateFile($fileStore.currentFile.name, {
          ...$fileStore.currentFile,
          content: content
        });
      }
      
      // Update store with new content
      fileStore.setCurrentContent(content);
      lastLoadedContent = content;
    } catch (error: any) {
      fileStore.setError(`Error saving key metadata: ${error.message}`);
    }
  }

  async function saveFile() {
    if (!$fileStore.currentFile || !hasChanges) return;

    try {
      isSaving = true;
      fileStore.setError(null);
      saveSuccess = false;

      if ($fileStore.storageMode === 'filesystem' && $fileStore.currentFile.handle) {
        // Save to filesystem
        const writable = await $fileStore.currentFile.handle.createWritable();
        await writable.write(editedContent);
        await writable.close();
      } else {
        // Save to browser storage
        await saveBrowserFile($fileStore.currentFile.name, editedContent);
        
        // Update file entry in store
        fileStore.updateFile($fileStore.currentFile.name, {
          ...$fileStore.currentFile,
          content: editedContent
        });
      }
      
      // Update store with new content
      fileStore.setCurrentContent(editedContent);
      lastLoadedContent = editedContent;
      
      // Show success message briefly
      saveSuccess = true;
      setTimeout(() => {
        saveSuccess = false;
      }, 2000);
      
    } catch (error: any) {
      fileStore.setError(`Error saving file: ${error.message}`);
    } finally {
      isSaving = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Ctrl/Cmd + S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      saveFile();
    }
    // Ctrl/Cmd + Plus to zoom in
    if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
      event.preventDefault();
      zoomIn();
    }
    // Ctrl/Cmd + Minus to zoom out
    if ((event.ctrlKey || event.metaKey) && event.key === '-') {
      event.preventDefault();
      zoomOut();
    }
  }

  function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 10, editorConfig.maxZoom);
  }

  function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 10, editorConfig.minZoom);
  }

  function toggleAutoscroll() {
    isAutoscrolling = !isAutoscrolling;
    
    if (isAutoscrolling) {
      scrollAccumulator = 0; // Reset accumulator when starting
      const scroll = () => {
        if (!isAutoscrolling || !textareaRef) return;
        
        // Convert speed multiplier to pixels per frame (at 60fps)
        const pixelsPerFrame = (autoscrollSpeed * editorConfig.autoscrollPixelsPerSecond) / 60;
        scrollAccumulator += pixelsPerFrame;
        
        // Only apply integer pixels to scrollTop
        const pixelsToScroll = Math.floor(scrollAccumulator);
        if (pixelsToScroll > 0) {
          textareaRef.scrollTop += pixelsToScroll;
          scrollAccumulator -= pixelsToScroll;
        }
        
        autoscrollAnimationId = requestAnimationFrame(scroll);
      };
      autoscrollAnimationId = requestAnimationFrame(scroll);
    } else {
      if (autoscrollAnimationId !== null) {
        cancelAnimationFrame(autoscrollAnimationId);
        autoscrollAnimationId = null;
      }
    }
  }

  function increaseAutoscrollSpeed() {
    autoscrollSpeed = Math.min(autoscrollSpeed + editorConfig.autoscrollStepSize, editorConfig.maxAutoscrollSpeed);
  }

  function decreaseAutoscrollSpeed() {
    autoscrollSpeed = Math.max(autoscrollSpeed - editorConfig.autoscrollStepSize, editorConfig.minAutoscrollSpeed);
  }

  async function transposeUp() {
    await changeTransposeKey(7);
  }

  async function transposeDown() {
    await changeTransposeKey(-7);
  }

  async function changeTransposeKey(offset: number) {
    if (!$fileStore.currentFile || !editedContent) return;

    try {
      // First ensure metadata is up to date
      await updateKeyMetadataIfNeeded();

      const contentToTranspose = editedContent;
      const result = parseMetadata(contentToTranspose);

      // Calculate update everything
      key = ((key + offset) % 12 + 12) % 12;
      result.metadata.key = key.toString();
      const updatedContent = serializeWithMetadata(result.metadata, result.contentWithoutMetadata);
      editedContent = updatedContent;
      await saveUpdatedContent(updatedContent);

    } catch (error: any) {
      console.error('Error transposing key:', error);
    }
  }
</script>

<div class="file-editor">
  {#if $fileStore.currentFile}
    {#if viewMode === 'text'}
      <textarea
        bind:this={textareaRef}
        bind:value={editedContent}
        onkeydown={handleKeydown}
        spellcheck="false"
        placeholder="File content..."
        style="font-size: {zoomLevel}%; background-color: {$themeStore === 'light' ? '#ffffff' : '#1e1e1e'}; color: {$themeStore === 'light' ? '#333333' : '#e0e0e0'};"
      ></textarea>
    {:else if viewMode === 'structure'}
      <div class="chord-view-container">
        <ChordView 
          content={editedContent} 
          zoomLevel={zoomLevel}
          isAutoscrolling={isAutoscrolling}
          autoscrollSpeed={autoscrollSpeed}
          theme={$themeStore}
          showRootNumbers={false}
          keyNumber={key} 
        />
      </div>
    {:else if viewMode === 'chords'}
      <div class="chord-view-container">
        <ChordView 
          content={editedContent} 
          zoomLevel={zoomLevel}
          isAutoscrolling={isAutoscrolling}
          autoscrollSpeed={autoscrollSpeed}
          theme={$themeStore}
          showRootNumbers={true}
          keyNumber={key} 
        />
      </div>
    {/if}
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
  .file-editor {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    position: relative;
    width: 100%;
  }

  textarea {
    flex: 1;
    width: 100%;
    height: 100%;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.2);
    color: rgba(255, 255, 255, 0.87);
    border: none;
    resize: none;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    outline: none;
  }

  textarea::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .chord-view-container {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    background-color: rgba(0, 0, 0, 0.2);
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

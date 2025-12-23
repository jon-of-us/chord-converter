<script lang="ts">
  import { fileStore } from './fileStore';
  import { saveBrowserFile } from './indexedDB';
  import ChordView from './chord-visualization/ChordView.svelte';

  let editedContent = '';
  let isSaving = false;
  let saveSuccess = false;
  let lastLoadedContent = '';
  let viewMode: 'text' | 'chords' = 'text';
  let zoomLevel = 100;
  let isAutoscrolling = false;
  let autoscrollSpeed = 1; // pixels per frame
  let autoscrollIntervalId: number | null = null;
  let textareaRef: HTMLTextAreaElement;

  // Only sync when currentContent actually changes (new file loaded or saved)
  $: if ($fileStore.currentContent !== lastLoadedContent) {
    editedContent = $fileStore.currentContent;
    lastLoadedContent = $fileStore.currentContent;
  }

  $: hasChanges = editedContent !== $fileStore.currentContent;

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
    zoomLevel = Math.min(zoomLevel + 10, 200);
  }

  function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 10, 50);
  }

  function toggleAutoscroll() {
    isAutoscrolling = !isAutoscrolling;
    
    if (isAutoscrolling) {
      autoscrollIntervalId = window.setInterval(() => {
        if (textareaRef) {
          textareaRef.scrollTop += autoscrollSpeed;
        }
      }, 50);
    } else {
      if (autoscrollIntervalId !== null) {
        clearInterval(autoscrollIntervalId);
        autoscrollIntervalId = null;
      }
    }
  }

  function increaseAutoscrollSpeed() {
    autoscrollSpeed = Math.min(autoscrollSpeed + 0.5, 10);
  }

  function decreaseAutoscrollSpeed() {
    autoscrollSpeed = Math.max(autoscrollSpeed - 0.5, 0.5);
  }
</script>

<div class="file-editor">
  {#if $fileStore.currentFile}
    <div class="editor-header">
      <div class="file-info">
        <strong>{$fileStore.currentFile.name}</strong>
        {#if hasChanges}
          <span class="modified-indicator">●</span>
        {/if}
      </div>
      
      <div class="editor-actions">
        <div class="view-toggle">
          <button 
            class:active={viewMode === 'text'}
            on:click={() => viewMode = 'text'}
            title="Text view"
          >
            Text
          </button>
          <button 
            class:active={viewMode === 'chords'}
            on:click={() => viewMode = 'chords'}
            title="Chord view"
          >
            Chords
          </button>
        </div>

        {#if viewMode === 'text'}
          <div class="text-controls">
            <div class="zoom-control">
              <button 
                on:click={zoomOut}
                title="Zoom out (Ctrl/-)"
                class="small-button"
              >
                −
              </button>
              <span class="zoom-display">{zoomLevel}%</span>
              <button 
                on:click={zoomIn}
                title="Zoom in (Ctrl/+)"
                class="small-button"
              >
                +
              </button>
            </div>

            <div class="autoscroll-control">
              <button 
                on:click={toggleAutoscroll}
                class:active={isAutoscrolling}
                title="Toggle autoscroll"
              >
                {isAutoscrolling ? '⏸' : '▶'}
              </button>
              <button 
                on:click={decreaseAutoscrollSpeed}
                title="Decrease speed"
                class="small-button"
                disabled={autoscrollSpeed <= 0.5}
              >
                −
              </button>
              <span class="speed-display">{autoscrollSpeed.toFixed(1)}x</span>
              <button 
                on:click={increaseAutoscrollSpeed}
                title="Increase speed"
                class="small-button"
                disabled={autoscrollSpeed >= 10}
              >
                +
              </button>
            </div>
          </div>
        {/if}

        {#if saveSuccess}
          <span class="success-message">Saved!</span>
        {/if}
        <button 
          on:click={saveFile} 
          disabled={!hasChanges || isSaving}
          class="save-button"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>

    {#if viewMode === 'text'}
      <textarea
        bind:this={textareaRef}
        bind:value={editedContent}
        on:keydown={handleKeydown}
        spellcheck="false"
        placeholder="File content..."
        style="font-size: {zoomLevel}%"
      ></textarea>
    {:else}
      <div class="chord-view-container">
        <ChordView content={editedContent} />
      </div>
    {/if}

    <div class="editor-footer">
      <span class="hint">Press Ctrl+S (or Cmd+S) to save</span>
      <span class="char-count">{editedContent.length} characters</span>
    </div>
  {:else}
    <div class="no-file-selected">
      <p>Select a file to start editing</p>
    </div>
  {/if}

  {#if $fileStore.error}
    <div class="error-message">
      {$fileStore.error}
      <button on:click={() => fileStore.setError(null)}>Dismiss</button>
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
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .modified-indicator {
    color: #646cff;
    font-size: 20px;
    line-height: 0;
  }

  .editor-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .view-toggle {
    display: flex;
    gap: 0;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 2px;
  }

  .view-toggle button {
    padding: 0.4rem 1rem;
    background-color: transparent;
    color: rgba(255, 255, 255, 0.6);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .view-toggle button:hover {
    color: rgba(255, 255, 255, 0.87);
    background-color: rgba(255, 255, 255, 0.05);
  }

  .view-toggle button.active {
    background-color: #646cff;
    color: white;
  }

  .text-controls {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .zoom-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: rgba(255, 255, 255, 0.05);
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
  }

  .zoom-display,
  .speed-display {
    min-width: 45px;
    text-align: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  .autoscroll-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: rgba(255, 255, 255, 0.05);
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
  }

  .autoscroll-control button:first-child {
    min-width: 32px;
  }

  .small-button {
    padding: 0.3rem 0.6rem;
    background-color: transparent;
    color: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .small-button:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.87);
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .small-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .autoscroll-control button:not(.small-button) {
    padding: 0.3rem 0.8rem;
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .autoscroll-control button:not(.small-button):hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.87);
  }

  .autoscroll-control button:not(.small-button).active {
    background-color: #4caf50;
    color: white;
    border-color: #4caf50;
  }

  .success-message {
    color: #4caf50;
    font-size: 14px;
    animation: fadeIn 0.2s;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .save-button {
    padding: 0.5rem 1.25rem;
    background-color: #646cff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .save-button:hover:not(:disabled) {
    background-color: #535bf2;
  }

  .save-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  textarea {
    flex: 1;
    width: 100%;
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
    overflow-y: auto;
    background-color: rgba(0, 0, 0, 0.2);
  }

  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background-color: rgba(255, 255, 255, 0.03);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  .hint {
    font-style: italic;
  }

  .no-file-selected {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
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

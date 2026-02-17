<script lang="ts">
  import { fileStore } from '../stores/fileStore.svelte';
  import { fileManagerStore } from '../stores/fileManagerStore.svelte';
  import { themeStore } from '../stores/themeStore.svelte';
  import { editorStore } from '../stores/editorStore.svelte';
  import { editorConfig } from '../config';
  
  let {
    toggleLeftSidebar,
    leftSidebarVisible,
  }: {
    toggleLeftSidebar: () => void;
    leftSidebarVisible: boolean;
  } = $props();
  
  let currentFile = $derived(fileManagerStore.getSelectedFile());
  
  function handleSave() {
    if (currentFile && editorStore.hasChanges && !editorStore.isSaving) {
      editorStore.saveFile();
    }
  }
  
  function handleTranspose(offset: number) {
    if (currentFile) {
      editorStore.transpose(offset);
    }
  }
</script>

<div class="controls-sidebar">
  
  {#if currentFile}
    <div class="control-section">
      <button 
        class="control-button"
        class:active={editorStore.viewMode === 'text'}
        onclick={() => editorStore.setViewMode('text')}
        title="Text view"
      >
        Text
      </button>
      <button 
        class="control-button"
        class:active={editorStore.viewMode === 'structure'}
        onclick={() => editorStore.setViewMode('structure')}
        title="Structure view"
      >
        Structure
      </button>
      <button 
        class="control-button"
        class:active={editorStore.viewMode === 'chords'}
        onclick={() => editorStore.setViewMode('chords')}
        title="Chord view with numbers"
      >
        Chords
      </button>
    </div>

    <div class="control-section">
      <h3>Zoom</h3>
      <div class="control-row">
        <button 
          onclick={() => editorStore.zoomOut()}
          title="Zoom out (Ctrl/-)"
          class="small-btn"
        >
          −
        </button>
        <span class="value">{editorStore.zoomLevel}%</span>
        <button 
          onclick={() => editorStore.zoomIn()}
          title="Zoom in (Ctrl/+)"
          class="small-btn"
        >
          +
        </button>
      </div>
    </div>

    <div class="control-section">
      <h3>Speed</h3>
      <button 
        onclick={() => editorStore.toggleAutoscroll()}
        class="control-button"
        class:active={editorStore.isAutoscrolling}
        title="Toggle autoscroll"
      >
        {editorStore.isAutoscrolling ? 'Pause' : 'Play'}
      </button>
      <div class="control-row">
        <button 
          onclick={() => editorStore.decreaseAutoscrollSpeed()}
          title="Decrease speed"
          class="small-btn"
          disabled={editorStore.autoscrollSpeed <= editorConfig.minAutoscrollSpeed}
        >
          −
        </button>
        <span class="value">{editorStore.autoscrollSpeed.toFixed(1)}x</span>
        <button 
          onclick={() => editorStore.increaseAutoscrollSpeed()}
          title="Increase speed"
          class="small-btn"
          disabled={editorStore.autoscrollSpeed >= editorConfig.maxAutoscrollSpeed}
        >
          +
        </button>
      </div>
    </div>

    <div class="control-section">
      <h3>Transpose</h3>
      <div class="control-row">
        <button 
          onclick={() => handleTranspose(-7)}
          title="Transpose down"
          class="small-btn"
          disabled={editorStore.viewMode === 'text'}
        >
          −
        </button>
        <span class="value">Key</span>
        <button 
          onclick={() => handleTranspose(7)}
          title="Transpose up"
          class="small-btn"
          disabled={editorStore.viewMode === 'text'}
        >
          +
        </button>
      </div>
    </div>

    <div class="control-section">
      <button 
        onclick={() => themeStore.toggle()}
        class="control-button"
        title="Toggle dark/light mode"
      >
        {themeStore.theme === 'dark' ? '☀' : '🌙'}
      </button>
      <button 
        onclick={toggleLeftSidebar}
        class="control-button"
        title={leftSidebarVisible ? 'Hide file list' : 'Show file list'}
      >
        {leftSidebarVisible ? 'Hide Files' : 'Show Files'}
      </button>
    </div>



    <div class="control-section save-section">
      {#if editorStore.saveSuccess}
        <div class="success-indicator">✓</div>
      {/if}
      <button 
        onclick={handleSave}
        disabled={!editorStore.hasChanges || editorStore.isSaving}
        class="control-button save-button"
        title="Save (Ctrl+S)"
      >
        {editorStore.isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  {/if}
</div>

<style>
  .controls-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }

  .control-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-section h3 {
    margin: 0 0 0.4rem 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    font-weight: 600;
  }

  .control-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .control-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.5rem;
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    min-height: 36px;
    min-width: 60px;
  }

  .control-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  .control-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .control-button.active {
    background-color: #646cff;
    border-color: #646cff;
    color: white;
  }

  .save-button {
    background-color: rgba(100, 108, 255, 0.2);
    border-color: #646cff;
  }

  .save-button:hover:not(:disabled) {
    background-color: #646cff;
    border-color: #535bf2;
  }

  .save-section {
    margin-top: auto;
  }

  .small-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .small-btn:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  .small-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .value {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
    min-width: 35px;
    text-align: center;
  }

  .success-indicator {
    text-align: center;
    font-size: 24px;
    color: #4caf50;
    animation: fadeIn 0.3s;
  }

  @keyframes fadeIn {
    from { 
      opacity: 0;
      transform: scale(0.5);
    }
    to { 
      opacity: 1;
      transform: scale(1);
    }
  }
</style>

<script lang="ts">
  import { fileStore } from '../stores/fileStore';
  import * as fileManagerService from '../services/fileManagerService';

  async function downloadAllFiles() {
    try {
      await fileManagerService.downloadAllFiles($fileStore.files);
    } catch (error) {
      // Error already handled in service
    }
  }

  async function downloadCurrentFile() {
    if (!$fileStore.currentFile) {
      fileStore.setError('No file selected');
      return;
    }

    try {
      await fileManagerService.downloadFile($fileStore.currentFile);
    } catch (error) {
      // Error already handled in service
    }
  }
</script>

{#if $fileStore.storageMode === 'browser' && $fileStore.files.length > 0}
  <div class="download-section">
    <button 
      onclick={downloadCurrentFile}
      disabled={!$fileStore.currentFile || $fileStore.loading}
      class="download-button"
      title="Download current file"
    >
      ⬇️ Current
    </button>
    <button 
      onclick={downloadAllFiles}
      disabled={$fileStore.loading}
      class="download-button"
      title="Download all files"
    >
      ⬇️ All ({$fileStore.files.length})
    </button>
  </div>
{/if}

<style>
  .download-section {
    display: flex;
    gap: 0.5rem;
  }

  .download-button {
    padding: 0.5rem 1rem;
    background-color: rgba(100, 108, 255, 0.2);
    color: #646cff;
    border: 1px solid #646cff;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .download-button:hover:not(:disabled) {
    background-color: rgba(100, 108, 255, 0.3);
  }

  .download-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>

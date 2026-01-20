<script lang="ts">
  import { fileStore } from '../stores/fileStore';
  import * as fileService from '../services/fileService';

  async function downloadAllFiles() {
    if ($fileStore.files.length === 0) {
      fileStore.setError('No files to download');
      return;
    }

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      for (const file of $fileStore.files) {
        const content = await fileService.readFile(file);
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error: any) {
      fileStore.setError(`Error downloading files: ${error.message}`);
    } finally {
      fileStore.setLoading(false);
    }
  }

  async function downloadCurrentFile() {
    if (!$fileStore.currentFile) {
      fileStore.setError('No file selected');
      return;
    }

    try {
      fileStore.setError(null);

      const content = await fileService.readFile($fileStore.currentFile);

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = $fileStore.currentFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      fileStore.setError(`Error downloading file: ${error.message}`);
    }
  }
</script>

{#if $fileStore.storageMode === 'browser' && $fileStore.files.length > 0}
  <div class="download-section">
    <button 
      on:click={downloadCurrentFile}
      disabled={!$fileStore.currentFile || $fileStore.loading}
      class="download-button"
      title="Download current file"
    >
      ⬇️ Current
    </button>
    <button 
      on:click={downloadAllFiles}
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

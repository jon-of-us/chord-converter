<script lang="ts">
  import { fileStore } from './fileStore';

  async function downloadAllFiles() {
    if ($fileStore.files.length === 0) {
      fileStore.setError('No files to download');
      return;
    }

    try {
      fileStore.setLoading(true);
      fileStore.setError(null);

      // Download each file individually
      for (const file of $fileStore.files) {
        let content = '';
        
        if ($fileStore.storageMode === 'filesystem' && file.handle) {
          const fileData = await file.handle.getFile();
          content = await fileData.text();
        } else {
          content = file.content || '';
        }
        
        // Create download link for each file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Small delay between downloads to avoid browser blocking
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

      let content = '';
      
      if ($fileStore.storageMode === 'filesystem' && $fileStore.currentFile.handle) {
        const fileData = await $fileStore.currentFile.handle.getFile();
        content = await fileData.text();
      } else {
        content = $fileStore.currentContent;
      }

      // Create download link
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

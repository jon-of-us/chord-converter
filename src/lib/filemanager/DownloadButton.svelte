<script lang="ts">
  import { fileStore } from '../stores/fileStore.svelte';
  import Button from '../components/Button.svelte';

  async function downloadAllFiles() {
    try {
      await fileStore.downloadAllFiles(fileStore.files);
    } catch (error) {
      // Error already handled in store
    }
  }

  async function downloadCurrentFile() {
    if (!fileStore.currentFile) {
      fileStore.error = 'No file selected';
      return;
    }

    try {
      await fileStore.downloadFile(fileStore.currentFile);
    } catch (error) {
      // Error already handled in store
    }
  }
</script>

{#if fileStore.storageMode === 'browser' && fileStore.files.length > 0}
  <div class="download-section">
    <Button
      onclick={downloadCurrentFile}
      disabled={!fileStore.currentFile || fileStore.loading}
      title="Download current file"
    >
      ⬇️ Current
    </Button>
    <Button
      onclick={downloadAllFiles}
      disabled={fileStore.loading}
      title="Download all files"
    >
      ⬇️ All ({fileStore.files.length})
    </Button>
  </div>
{/if}

<style>
  .download-section {
    display: flex;
    gap: 0.5rem;
  }
  
  .download-section :global(.btn) {
    flex: 1;
  }
</style>

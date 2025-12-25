<script lang="ts">
  import { fileStore } from './fileStore';

  interface Props {
    onAddFile: (folderPath?: string) => void | Promise<void>;
  }

  let { onAddFile }: Props = $props();
</script>

<div class="footer">
  <button 
    class="add-button" 
    onclick={() => onAddFile()}
    disabled={$fileStore.loading}
    title="Add new file (use folder/file for subfolders, folder/ for empty folder)"
  >
    + New File
  </button>
</div>

<style>
  .footer {
    padding: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .add-button {
    padding: 0.5rem 1rem;
    background-color: rgba(100, 108, 255, 0.2);
    border: 1px solid rgba(100, 108, 255, 0.3);
    border-radius: 4px;
    color: #646cff;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .add-button:hover:not(:disabled) {
    background-color: rgba(100, 108, 255, 0.3);
    border-color: #646cff;
  }

  .add-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>

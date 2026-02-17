<script lang="ts">
  import * as svlete from 'svelte';
  import { editorStore } from '../stores/editorStore.svelte';
  import { themeStore } from '../stores/themeStore.svelte';
  import { fileStore } from '../stores/fileStore.svelte';
  
  let textareaRef = $state<HTMLTextAreaElement>();
  $effect(() => {
    editorStore.editedContent = fileStore.currentFile?.content || '';
  });
  
  
  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
    }
    // Ctrl/Cmd + Plus to zoom in
    if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
      event.preventDefault();
      editorStore.zoomIn();
    }
    // Ctrl/Cmd + Minus to zoom out
    if ((event.ctrlKey || event.metaKey) && event.key === '-') {
      event.preventDefault();
      editorStore.zoomOut();
    }
  }
</script>

<textarea
  bind:this={textareaRef}
  bind:value={editorStore.editedContent}
  onkeydown={handleKeydown}
  spellcheck="false"
  placeholder="File content..."
  style="font-size: {editorStore.zoomLevel}%; background-color: {themeStore.theme === 'light' ? '#ffffff' : '#1e1e1e'}; color: {themeStore.theme === 'light' ? '#333333' : '#e0e0e0'};"
></textarea>

<style>
  textarea {
    flex: 1;
    width: 100%;
    height: 100%;
    padding: 1rem 1rem 1rem 3rem;
    background-color: rgba(0, 0, 0, 0.2);
    color: rgba(255, 255, 255, 0.87);
    border: none;
    resize: none;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
    font-size: 1em; /* Use relative sizing like ChordView */
    line-height: 1.6;
    outline: none;
  }

  textarea::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
</style>

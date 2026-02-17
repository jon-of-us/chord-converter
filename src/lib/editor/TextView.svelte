<script lang="ts">
  import { editorStore } from '../stores/editorStore.svelte';
  import { themeStore } from '../stores/themeStore.svelte';
  import { fileManagerStore } from '../stores/fileManagerStore.svelte';
  
  let textareaRef = $state<HTMLTextAreaElement>();
  
  $effect(() => {
    // Load cached content into editor when file selection changes
    editorStore.editedContent = fileManagerStore.cachedContent;
  });
  
  // Add keyboard shortcuts with proper cleanup
  $effect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        editorStore.saveFile();
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
    
    document.addEventListener('keydown', handleKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });

</script>

<textarea
  bind:this={textareaRef}
  bind:value={editorStore.editedContent}
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

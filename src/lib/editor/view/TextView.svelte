<script lang="ts">
  import { editorStore } from '../../stores/editorStore';
  import { themeStore } from '../../stores/themeStore';
  
  let { content = $bindable('') }: { content: string } = $props();
  
  let textareaRef = $state<HTMLTextAreaElement>();
  let zoomLevel = $derived($editorStore.zoomLevel);
  let theme = $derived($themeStore);
  
  function handleKeydown(event: KeyboardEvent) {
    // Ctrl/Cmd + S to save - but we don't handle save here, it's in Editor
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      // Let the Editor component handle this via document event listener
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
  bind:value={content}
  onkeydown={handleKeydown}
  spellcheck="false"
  placeholder="File content..."
  style="font-size: {zoomLevel}%; background-color: {theme === 'light' ? '#ffffff' : '#1e1e1e'}; color: {theme === 'light' ? '#333333' : '#e0e0e0'};"
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
    font-size: 14px;
    line-height: 1.6;
    outline: none;
  }

  textarea::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
</style>

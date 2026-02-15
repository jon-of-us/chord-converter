<script lang="ts">
  import * as Svelte from 'svelte';
  import TextView from './TextView.svelte';
  import ChordView from '../../chords/ChordView.svelte';
  import { editorStore } from '../../stores/editorStore';
  import * as chordFileService from '../../services/chordFileService';
  import * as editorService from '../../services/editorService';
  import { fileStore } from '../../stores/fileStore';
  
  let { content = $bindable('') }: { content: string } = $props();
  
  let viewMode = $derived($editorStore.viewMode);
  let currentFile = $derived($fileStore.currentFile);
  let previousViewMode = $state<string>('text');
  
  // Ensure numeric key when entering visual modes
  $effect(() => {
    if (viewMode !== 'text' && viewMode !== previousViewMode && content && currentFile) {
      const chordFile = chordFileService.parseChordFile(content);
      editorService.ensureNumericKey(currentFile, chordFile);
      previousViewMode = viewMode;
    } else if (viewMode === 'text') {
      previousViewMode = viewMode;
    }
  });
</script>

<div class="editor-view">
  {#if viewMode === 'text'}
    <TextView bind:content={content} />
  {:else if viewMode === 'structure' || viewMode === 'chords'}
    <ChordView />
  {/if}
</div>

<style>
  .editor-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    width: 100%;
  }
</style>

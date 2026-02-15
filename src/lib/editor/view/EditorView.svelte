<script lang="ts">
  import * as Svelte from 'svelte';
  import TextView from './TextView.svelte';
  import ChordViewContainer from './ChordViewContainer.svelte';
  import { editorStore } from '../../stores/editorStore';
  import * as chordFileService from '../../services/chordFileService';
  import * as editorService from '../../services/editorService';
  import { fileStore } from '../../stores/fileStore';
  
  let { content = $bindable('') }: { content: string } = $props();
  
  let viewMode = $derived($editorStore.viewMode);
  let parsedChordFile = $derived($editorStore.parsedChordFile);
  let currentFile = $derived($fileStore.currentFile);
  
  // Parse ChordFile when entering visual modes
  $effect(() => {
    if (viewMode !== 'text' && content && currentFile) {
      // Parse and cache ChordFile when switching to structure/chords mode
      if (!parsedChordFile) {
        const chordFile = chordFileService.parseChordFile(content);
        
        // Ensure numeric key on the already-parsed ChordFile
        editorService.ensureNumericKey(currentFile, chordFile);
      }
    } else if (viewMode === 'text') {
      // Clear cached ChordFile when switching to text mode
      if (parsedChordFile) {
        editorStore.setParsedChordFile(null);
      }
    }
  });
</script>

<div class="editor-view">
  {#if viewMode === 'text'}
    <TextView bind:content={content} />
  {:else if parsedChordFile && (viewMode === 'structure' || viewMode === 'chords')}
    <ChordViewContainer chordFile={parsedChordFile} showRootNumbers={viewMode === 'chords'} />
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

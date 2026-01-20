<script lang="ts">
  import TextView from './TextView.svelte';
  import ChordViewContainer from './ChordViewContainer.svelte';
  import { editorStore } from '../../stores/editorStore';
  
  let { content = $bindable('') }: { content: string } = $props();
  
  let viewMode = $derived($editorStore.viewMode);
</script>

<div class="editor-view">
  {#if viewMode === 'text'}
    <TextView bind:content={content} />
  {:else if viewMode === 'structure'}
    <ChordViewContainer {content} showRootNumbers={false} />
  {:else if viewMode === 'chords'}
    <ChordViewContainer {content} showRootNumbers={true} />
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

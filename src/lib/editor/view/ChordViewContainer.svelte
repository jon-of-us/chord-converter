<script lang="ts">
  import ChordView from '../../chords/ChordView.svelte';
  import { editorStore } from '../../stores/editorStore';
  import { themeStore } from '../../stores/themeStore';
  
  let { 
    content, 
    showRootNumbers 
  }: { 
    content: string; 
    showRootNumbers: boolean;
  } = $props();
  
  let zoomLevel = $derived($editorStore.zoomLevel);
  let isAutoscrolling = $derived($editorStore.isAutoscrolling);
  let autoscrollSpeed = $derived($editorStore.autoscrollSpeed);
  let keyNumber = $derived($editorStore.keyNumber);
  let theme = $derived($themeStore);
</script>

<div class="chord-view-container">
  <ChordView 
    {content}
    {zoomLevel}
    {isAutoscrolling}
    {autoscrollSpeed}
    {theme}
    {showRootNumbers}
    {keyNumber}
  />
</div>

<style>
  .chord-view-container {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    background-color: rgba(0, 0, 0, 0.2);
  }
</style>

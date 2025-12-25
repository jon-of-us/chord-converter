<script lang="ts">
  import { onMount } from 'svelte';
  import FolderPicker from './lib/FolderPicker.svelte'
  import FileList from './lib/FileList.svelte'
  import FileEditor, { type EditorControls } from './lib/FileEditor.svelte'
  import ControlsSidebar from './lib/ControlsSidebar.svelte'
  import { fileStore, type FileEntry } from './lib/fileStore';
  import { loadAllBrowserFiles } from './lib/indexedDB';

  let fileListRef: any = $state();

  let editorControls: EditorControls = $state({
    viewMode: 'text',
    zoomLevel: 100,
    isAutoscrolling: false,
    autoscrollSpeed: 1,
    hasChanges: false,
    isSaving: false,
    saveSuccess: false,
    setViewMode: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
    toggleAutoscroll: () => {},
    increaseAutoscrollSpeed: () => {},
    decreaseAutoscrollSpeed: () => {},
    saveFile: () => {}
  });

  onMount(async () => {
    // Load files from browser storage on startup
    try {
      const browserFiles = await loadAllBrowserFiles();
      
      if (browserFiles.length > 0) {
        const files: FileEntry[] = browserFiles.map(f => ({
          name: f.name,
          path: f.name,
          content: String(f.content) // Create a copy to avoid reference issues
        }));
        
        fileStore.setFiles(files);
        
        // Auto-open first file
        const firstFile = files[0];
        fileStore.setCurrentFile(firstFile);
        fileStore.setCurrentContent(String(firstFile.content || '')); // Create a copy
      }
    } catch (error) {
      console.error('Error loading browser files:', error);
    }
  });

  function handleEditorClick() {
    if (fileListRef?.clearSelection) {
      fileListRef.clearSelection();
    }
  }
</script>

<div class="app-container">
  <div class="main-content">
    <aside class="left-sidebar">
      <h1>Chord Converter</h1>
      <FolderPicker />
      <FileList bind:this={fileListRef} />
    </aside>
    
    <main class="editor-area">
      <div class="editor-click-area" role="button" tabindex="0" onclick={handleEditorClick} onkeydown={(e) => e.key === 'Enter' && handleEditorClick()}>
        <FileEditor bind:controls={editorControls} />
      </div>
    </main>
    
    <aside class="right-sidebar">
      <ControlsSidebar 
        viewMode={editorControls.viewMode}
        zoomLevel={editorControls.zoomLevel}
        isAutoscrolling={editorControls.isAutoscrolling}
        autoscrollSpeed={editorControls.autoscrollSpeed}
        hasChanges={editorControls.hasChanges}
        isSaving={editorControls.isSaving}
        saveSuccess={editorControls.saveSuccess}
        onViewModeChange={editorControls.setViewMode}
        onZoomIn={editorControls.zoomIn}
        onZoomOut={editorControls.zoomOut}
        onToggleAutoscroll={editorControls.toggleAutoscroll}
        onIncreaseSpeed={editorControls.increaseAutoscrollSpeed}
        onDecreaseSpeed={editorControls.decreaseAutoscrollSpeed}
        onSave={editorControls.saveFile}
      />
    </aside>
  </div>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .left-sidebar {
    display: flex;
    flex-direction: column;
    width: 300px;
    background-color: rgba(255, 255, 255, 0.03);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    padding-top: 1rem;
  }

  .left-sidebar h1 {
    margin: 0 1rem 1rem 1rem;
    font-size: 1.3rem;
    color: #646cff;
    flex-shrink: 0;
  }

  .editor-area {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .editor-click-area {
    flex: 1;
    display: flex;
    overflow: hidden;
    outline: none;
  }

  .right-sidebar {
    width: 130px;
    background-color: rgba(255, 255, 255, 0.03);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    padding: 1rem 0.5rem;
    gap: 1rem;
    overflow-y: auto;
  }
</style>

<script lang="ts">
  import * as Svelte from 'svelte';
  import FolderPicker from './lib/filemanager/FolderPicker.svelte'
  import FileManager from './lib/filemanager/FileManager.svelte'
  import Editor from './lib/editor/Editor.svelte'
  import EditorControls from './lib/editor/controls/EditorControls.svelte'
  import { fileStore } from './lib/stores/fileStore';
  import * as fileService from './lib/services/fileService';
  import { sidebarConfig } from './lib/config';

  Svelte.onMount(async () => {
    // Check if File System Access API is available
    const isFileSystemSupported = 'showDirectoryPicker' in window;
    
    if (!isFileSystemSupported) {
      alert('In this browser you can not connect the app to a local folder. For full functionality, please use Chrome or Edge on a computer.');
    }

    // Load files from browser storage on startup
    try {
      const files = await fileService.loadBrowserFiles();
      
      if (files.length > 0) {
        fileStore.setFiles(files);
        
        // Auto-open first file
        const firstFile = files[0];
        fileStore.setCurrentFile(firstFile);
        fileStore.setCurrentContent(String(firstFile.content || ''));
      }
    } catch (error) {
      console.error('Error loading browser files:', error);
    }
  });
</script>

<div class="app-container" style="
  --sidebar-left-bg: {sidebarConfig.leftSidebarBg};
  --sidebar-left-border: {sidebarConfig.leftSidebarBorder};
  --sidebar-left-text: {sidebarConfig.leftSidebarText};
  --sidebar-right-bg: {sidebarConfig.rightSidebarBg};
  --sidebar-right-border: {sidebarConfig.rightSidebarBorder};
  --sidebar-right-text: {sidebarConfig.rightSidebarText};
">
  <div class="main-content">
    <aside class="left-sidebar">
      <h1>Chord Converter</h1>
      <FolderPicker />
      <FileManager />
    </aside>
    
    <main class="editor-area">
      <Editor />
    </main>
    
    <aside class="right-sidebar">
      <EditorControls />
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
    background-color: var(--sidebar-left-bg);
    border-right: 1px solid var(--sidebar-left-border);
    overflow: hidden;
    padding-top: 1rem;
    color: var(--sidebar-left-text);
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

  .right-sidebar {
    width: 130px;
    background-color: var(--sidebar-right-bg);
    border-left: 1px solid var(--sidebar-right-border);
    display: flex;
    flex-direction: column;
    padding: 1rem 0.5rem;
    gap: 1rem;
    overflow-y: auto;
    color: var(--sidebar-right-text);
  }
</style>

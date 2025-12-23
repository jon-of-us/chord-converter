<script lang="ts">
  import { onMount } from 'svelte';
  import FolderPicker from './lib/FolderPicker.svelte'
  import FileList from './lib/FileList.svelte'
  import FileEditor from './lib/FileEditor.svelte'
  import { fileStore, type FileEntry } from './lib/fileStore';
  import { loadAllBrowserFiles } from './lib/indexedDB';

  onMount(async () => {
    // Load files from browser storage on startup
    try {
      const browserFiles = await loadAllBrowserFiles();
      
      if (browserFiles.length > 0) {
        const files: FileEntry[] = browserFiles.map(f => ({
          name: f.name,
          content: f.content
        }));
        
        fileStore.setFiles(files);
        
        // Auto-open first file
        const firstFile = files[0];
        fileStore.setCurrentFile(firstFile);
        fileStore.setCurrentContent(firstFile.content || '');
      }
    } catch (error) {
      console.error('Error loading browser files:', error);
    }
  });
</script>

<div class="app-container">
  <header>
    <h1>Chord Converter</h1>
  </header>

  <FolderPicker />

  <div class="main-content">
    <FileList />
    <FileEditor />
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

  header {
    padding: 1rem 1.5rem;
    background-color: rgba(100, 108, 255, 0.1);
    border-bottom: 2px solid rgba(100, 108, 255, 0.3);
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #646cff;
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
</style>

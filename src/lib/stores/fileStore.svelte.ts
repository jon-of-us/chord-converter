import * as fileService from '../services/fileService';

export type StorageMode = 'browser' | 'filesystem';

export class FileEntry {
  constructor(
    public name: string,
    public path: string, // Full path relative to root (e.g., "subfolder/file.chords")
    public handle?: FileSystemFileHandle, // filesystem mode
    public content?: string // browser mode
  ) {}
}

class FileStore {
  storageMode = $state<StorageMode>('browser');
  folderHandle = $state<FileSystemDirectoryHandle | null>(null);
  files = $state<FileEntry[]>([]);
  currentFile = $state<FileEntry | null>(null);
  currentContent = $state('');
  error = $state<string | null>(null);
  loading = $state(false);

  setStorageMode(mode: StorageMode) {
    this.storageMode = mode;
  }

  setFolderHandle(handle: FileSystemDirectoryHandle | null) {
    // Update storage implementation
    fileService.setStorage(handle);
    
    this.folderHandle = handle;
    this.storageMode = handle ? 'filesystem' : 'browser';
    if (handle) {
      this.files = [];
    }
  }

  setFiles(files: FileEntry[]) {
    this.files = files;
  }

  addFile(file: FileEntry) {
    this.files = [...this.files, file].sort((a, b) => a.name.localeCompare(b.name));
  }

  updateFile(oldName: string, newFile: FileEntry) {
    this.files = this.files.map(f => f.name === oldName ? newFile : f).sort((a, b) => a.name.localeCompare(b.name));
    if (this.currentFile?.name === oldName) {
      this.currentFile = newFile;
    }
  }

  deleteFile(path: string) {
    this.files = this.files.filter(f => f.path !== path);
    if (this.currentFile?.path === path) {
      this.currentFile = null;
      this.currentContent = '';
    }
  }

  setCurrentFile(file: FileEntry | null) {
    this.currentFile = file;
  }

  setCurrentContent(content: string) {
    this.currentContent = content;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setLoading(loading: boolean) {
    this.loading = loading;
  }

  reset() {
    this.storageMode = 'browser';
    this.folderHandle = null;
    this.files = [];
    this.currentFile = null;
    this.currentContent = '';
    this.error = null;
    this.loading = false;
  }
}

export const fileStore = new FileStore();

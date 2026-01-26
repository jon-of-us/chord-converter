import { writable } from 'svelte/store';
import * as fileService from '../services/fileService';

export type StorageMode = 'browser' | 'filesystem';

export interface FileEntry {
  name: string;
  path: string; // Full path relative to root (e.g., "subfolder/file.chords")
  handle?: FileSystemFileHandle; // Optional for browser mode
  content?: string; // Used in browser mode
}

export interface AppState {
  storageMode: StorageMode;
  folderHandle: FileSystemDirectoryHandle | null;
  files: FileEntry[];
  currentFile: FileEntry | null;
  currentContent: string;
  error: string | null;
  loading: boolean;
}

const initialState: AppState = {
  storageMode: 'browser',
  folderHandle: null,
  files: [],
  currentFile: null,
  currentContent: '',
  error: null,
  loading: false,
};

function createFileStore() {
  const { subscribe, set, update } = writable<AppState>(initialState);

  return {
    subscribe,
    setStorageMode: (mode: StorageMode) => {
      update(state => ({ ...state, storageMode: mode }));
    },
    setFolderHandle: (handle: FileSystemDirectoryHandle | null) => {
      // Update storage implementation
      fileService.setStorage(handle);
      
      update(state => ({ 
        ...state, 
        folderHandle: handle, 
        storageMode: handle ? 'filesystem' : 'browser',
        files: handle ? [] : state.files 
      }));
    },
    setFiles: (files: FileEntry[]) => {
      update(state => ({ ...state, files }));
    },
    addFile: (file: FileEntry) => {
      update(state => ({
        ...state,
        files: [...state.files, file].sort((a, b) => a.name.localeCompare(b.name))
      }));
    },
    updateFile: (oldName: string, newFile: FileEntry) => {
      update(state => ({
        ...state,
        files: state.files.map(f => f.name === oldName ? newFile : f).sort((a, b) => a.name.localeCompare(b.name)),
        currentFile: state.currentFile?.name === oldName ? newFile : state.currentFile
      }));
    },
    deleteFile: (path: string) => {
      update(state => ({
        ...state,
        files: state.files.filter(f => f.path !== path),
        currentFile: state.currentFile?.path === path ? null : state.currentFile,
        currentContent: state.currentFile?.path === path ? '' : state.currentContent
      }));
    },
    setCurrentFile: (file: FileEntry | null) => {
      update(state => ({ ...state, currentFile: file }));
    },
    setCurrentContent: (content: string) => {
      update(state => ({ ...state, currentContent: content }));
    },
    setError: (error: string | null) => {
      update(state => ({ ...state, error }));
    },
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, loading }));
    },
    reset: () => {
      set(initialState);
    },
  };
}

export const fileStore = createFileStore();

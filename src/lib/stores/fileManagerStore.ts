import { writable } from 'svelte/store';

/**
 * File Manager Store
 * Manages UI state for the file tree (expanded folders, editing, selection)
 */

export interface FileManagerState {
  expandedFolders: Set<string>;
  editingPath: string | null;
  editingValue: string;
  selectedFolderPath: string | null;
}

const initialState: FileManagerState = {
  expandedFolders: new Set<string>(),
  editingPath: null,
  editingValue: '',
  selectedFolderPath: null,
};

function createFileManagerStore() {
  const { subscribe, set, update } = writable<FileManagerState>(initialState);

  return {
    subscribe,
    
    // Folder expansion
    toggleFolder: (path: string) => {
      update(state => {
        const newExpanded = new Set(state.expandedFolders);
        if (newExpanded.has(path)) {
          newExpanded.delete(path);
        } else {
          newExpanded.add(path);
        }
        return {
          ...state,
          expandedFolders: newExpanded,
          selectedFolderPath: path,
        };
      });
    },
    
    expandFolder: (path: string) => {
      update(state => {
        const newExpanded = new Set(state.expandedFolders);
        newExpanded.add(path);
        return { ...state, expandedFolders: newExpanded };
      });
    },
    
    collapseFolder: (path: string) => {
      update(state => {
        const newExpanded = new Set(state.expandedFolders);
        newExpanded.delete(path);
        return { ...state, expandedFolders: newExpanded };
      });
    },
    
    expandPath: (path: string) => {
      update(state => {
        const newExpanded = new Set(state.expandedFolders);
        const parts = path.split('/');
        for (let i = 1; i <= parts.length; i++) {
          const folderPath = parts.slice(0, i).join('/');
          if (folderPath) newExpanded.add(folderPath);
        }
        return { ...state, expandedFolders: newExpanded };
      });
    },
    
    // Folder selection
    selectFolder: (path: string | null) => {
      update(state => ({ ...state, selectedFolderPath: path }));
    },
    
    // Editing
    startEditing: (path: string, currentName: string) => {
      update(state => ({
        ...state,
        editingPath: path,
        editingValue: currentName,
      }));
    },
    
    updateEditingValue: (value: string) => {
      update(state => ({ ...state, editingValue: value }));
    },
    
    cancelEditing: () => {
      update(state => ({
        ...state,
        editingPath: null,
        editingValue: '',
      }));
    },
    
    // Reset
    reset: () => {
      set(initialState);
    },
  };
}

export const fileManagerStore = createFileManagerStore();

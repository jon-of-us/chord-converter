import { writable, derived } from 'svelte/store';
import { editorConfig } from '../config';

/**
 * Editor Store
 * Manages editor-specific state: view mode, zoom, autoscroll, and edit buffer
 */

export type ViewMode = 'text' | 'structure' | 'chords';


export class EditorState {
  constructor(
    public viewMode: ViewMode = 'text',
    public zoomLevel: number = editorConfig.defaultZoom,
    public isAutoscrolling: boolean = false,
    public autoscrollSpeed: number = editorConfig.defaultAutoscrollSpeed,
    public editedContent: string = '',
    public lastSavedContent: string = '',
    public isSaving: boolean = false,
    public saveSuccess: boolean = false
  ) {}
}

const initialState = new EditorState();

function createEditorStore() {
  const { subscribe, set, update } = writable<EditorState>(initialState);

  return {
    subscribe,
    
    // View mode
    setViewMode: (mode: ViewMode) => {
      update(state => ({ ...state, viewMode: mode }));
    },
    
    // Zoom
    setZoomLevel: (level: number) => {
      update(state => ({ 
        ...state, 
        zoomLevel: Math.max(editorConfig.minZoom, Math.min(editorConfig.maxZoom, level))
      }));
    },
    zoomIn: () => {
      update(state => ({
        ...state,
        zoomLevel: Math.min(state.zoomLevel + 10, editorConfig.maxZoom)
      }));
    },
    zoomOut: () => {
      update(state => ({
        ...state,
        zoomLevel: Math.max(state.zoomLevel - 10, editorConfig.minZoom)
      }));
    },
    
    // Autoscroll
    setAutoscrolling: (enabled: boolean) => {
      update(state => ({ ...state, isAutoscrolling: enabled }));
    },
    toggleAutoscroll: () => {
      update(state => ({ ...state, isAutoscrolling: !state.isAutoscrolling }));
    },
    setAutoscrollSpeed: (speed: number) => {
      update(state => ({
        ...state,
        autoscrollSpeed: Math.max(
          editorConfig.minAutoscrollSpeed,
          Math.min(editorConfig.maxAutoscrollSpeed, speed)
        )
      }));
    },
    increaseAutoscrollSpeed: () => {
      update(state => ({
        ...state,
        autoscrollSpeed: Math.min(
          state.autoscrollSpeed + editorConfig.autoscrollStepSize,
          editorConfig.maxAutoscrollSpeed
        )
      }));
    },
    decreaseAutoscrollSpeed: () => {
      update(state => ({
        ...state,
        autoscrollSpeed: Math.max(
          state.autoscrollSpeed - editorConfig.autoscrollStepSize,
          editorConfig.minAutoscrollSpeed
        )
      }));
    },
    
    // Key
    setKeyNumber: (key: number) => {
      update(state => ({ ...state, keyNumber: (key % 12 + 12) % 12 }));
    },
    
    // Content
    setEditedContent: (content: string) => {
      update(state => ({ ...state, editedContent: content }));
    },
    setLastSavedContent: (content: string) => {
      update(state => ({ 
        ...state, 
        lastSavedContent: content,
        editedContent: content
      }));
    },
    
    // Combined updates
    loadContent: (content: string, keyNumber: number) => {
      update(state => ({
        ...state,
        editedContent: content,
        lastSavedContent: content,
        keyNumber: (keyNumber % 12 + 12) % 12
      }));
    },
    
    // Save state
    setSaving: (saving: boolean) => {
      update(state => ({ ...state, isSaving: saving }));
    },
    setSaveSuccess: (success: boolean) => {
      update(state => ({ ...state, saveSuccess: success }));
    },
    
    // Reset
    reset: () => {
      set(initialState);
    },
  };
}

export const editorStore = createEditorStore();

// Derived store for hasChanges
export const hasChanges = derived(
  editorStore,
  $editor => $editor.editedContent !== $editor.lastSavedContent
);

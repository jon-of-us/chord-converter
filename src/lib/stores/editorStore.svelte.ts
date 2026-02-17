import { editorConfig } from '../config';
import { fileStore, type FileEntry } from './fileStore.svelte';
import { fileManagerStore } from './fileManagerStore.svelte';
import * as ChordFileModel from '../models/ChordFile';

/**
 * Editor Store
 * Manages editor-specific state: view mode, zoom, autoscroll, and edit buffer
 */

export type ViewMode = 'text' | 'structure' | 'chords';

class EditorStore {
  viewMode = $state<ViewMode>('text');
  zoomLevel = $state(editorConfig.defaultZoom);
  isAutoscrolling = $state(false);
  autoscrollSpeed = $state(editorConfig.defaultAutoscrollSpeed);
  editedContent = $state('');
  isSaving = $state(false);
  saveSuccess = $state(false);

  // Derived property for hasChanges
  get hasChanges(): boolean {
    return this.editedContent !== fileManagerStore.cachedContent;
  }

  // ===== File Operations =====

  /**
   * Save edited content to file
   */
  async saveFile(): Promise<void> {
    try {
      this.isSaving = true;
      fileStore.error = null;
      const file = fileManagerStore.getSelectedFile();
      if (!file) {
        throw new Error('No file selected');
      }
      await fileStore.storage.writeFile(file, this.editedContent);

      fileManagerStore.updateCachedContent(this.editedContent);
      this.saveSuccess = true;

      setTimeout(() => {
        this.saveSuccess = false;
      }, 2000);
    } catch (error: any) {
      fileStore.error = `Error saving file: ${error.message}`;
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Transpose key by semitone offset
   * Parses content, transposes, and saves
   */
  async transpose(offset: number): Promise<void> {
    try {
      this.saveFile() 
      const file = fileManagerStore.getSelectedFile();
      if (!file) {
        throw new Error('No file selected');
      }
      
      // Parse, transpose, and serialize
      const chordFile = ChordFileModel.ChordFile.parse(fileManagerStore.cachedContent);
      chordFile.transpose(offset);
      const newContent = chordFile.serialize();

      // Update cache and save directly
      fileManagerStore.updateCachedContent(newContent);
      this.editedContent = newContent;
      await fileStore.storage.writeFile(file, newContent);
    } catch (error: any) {
      console.error('Error transposing:', error);
      fileStore.error = `Error transposing: ${error.message}`;
      throw error;
    }
  }

  // ===== View Mode =====

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
  }

  // ===== Zoom =====

  setZoomLevel(level: number) {
    this.zoomLevel = Math.max(editorConfig.minZoom, Math.min(editorConfig.maxZoom, level));
  }

  zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel + 10, editorConfig.maxZoom);
  }

  zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel - 10, editorConfig.minZoom);
  }

  // ===== Autoscroll =====

  setAutoscrolling(enabled: boolean) {
    this.isAutoscrolling = enabled;
  }

  toggleAutoscroll() {
    this.isAutoscrolling = !this.isAutoscrolling;
  }

  setAutoscrollSpeed(speed: number) {
    this.autoscrollSpeed = Math.max(
      editorConfig.minAutoscrollSpeed,
      Math.min(editorConfig.maxAutoscrollSpeed, speed)
    );
  }

  increaseAutoscrollSpeed() {
    this.autoscrollSpeed = Math.min(
      this.autoscrollSpeed + editorConfig.autoscrollStepSize,
      editorConfig.maxAutoscrollSpeed
    );
  }

  decreaseAutoscrollSpeed() {
    this.autoscrollSpeed = Math.max(
      this.autoscrollSpeed - editorConfig.autoscrollStepSize,
      editorConfig.minAutoscrollSpeed
    );
  }
}

export const editorStore = new EditorStore();

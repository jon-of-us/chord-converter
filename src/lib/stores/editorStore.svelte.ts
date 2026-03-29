import { editorConfig } from '../config';
import { fileStore, type FileEntry } from './fileStore.svelte';
import { fileManagerStore } from './fileManagerStore.svelte';
import * as ChordFileModel from '../models/ChordFile';
import * as indexedDB from '../utils/indexedDB';

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

  private clampZoom(level: number): number {
    return Math.max(editorConfig.minZoom, Math.min(editorConfig.maxZoom, level));
  }

  private clampAutoscrollSpeed(speed: number): number {
    return Math.max(
      editorConfig.minAutoscrollSpeed,
      Math.min(editorConfig.maxAutoscrollSpeed, speed)
    );
  }

  private async persistSelectedFilePreferences(): Promise<void> {
    const file = fileManagerStore.getSelectedFile();
    if (!file) {
      return;
    }

    await indexedDB.saveFilePreferences(file.path, {
      zoom: this.zoomLevel,
      scrollSpeed: this.autoscrollSpeed,
    });
  }

  private async loadSelectedFilePreferences(): Promise<void> {
    const file = fileManagerStore.getSelectedFile();
    if (!file) {
      this.zoomLevel = editorConfig.defaultZoom;
      this.autoscrollSpeed = editorConfig.defaultAutoscrollSpeed;
      return;
    }

    const preferences = await indexedDB.loadFilePreferences(file.path);
    if (!preferences) {
      this.zoomLevel = editorConfig.defaultZoom;
      this.autoscrollSpeed = editorConfig.defaultAutoscrollSpeed;
      return;
    }

    this.zoomLevel = this.clampZoom(preferences.zoom);
    this.autoscrollSpeed = this.clampAutoscrollSpeed(preferences.scrollSpeed);
  }

  async ensureDetectedKeyForSelectedFile(): Promise<void> {
    const file = fileManagerStore.getSelectedFile();
    if (!file) {
      return;
    }

    const chordFile = ChordFileModel.ChordFile.parse(fileManagerStore.cachedContent);
    chordFile.ensureDetectedKeyMetadata();
    const updatedContent = chordFile.serialize();

    if (updatedContent === fileManagerStore.cachedContent) {
      return;
    }

    fileManagerStore.updateCachedContent(updatedContent);
    this.editedContent = updatedContent;
    await fileStore.storage.writeFile(file, updatedContent);
  }

  async onSelectedFileOpened(): Promise<void> {
    await this.loadSelectedFilePreferences();

    if (this.viewMode !== 'text') {
      await this.ensureDetectedKeyForSelectedFile();
    }

    this.editedContent = fileManagerStore.cachedContent;
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

  async setViewMode(mode: ViewMode): Promise<void> {
    if (this.viewMode === 'text' && mode !== 'text' && this.hasChanges) {
      await this.saveFile();
    }

    this.viewMode = mode;

    if (mode !== 'text') {
      await this.ensureDetectedKeyForSelectedFile();
    }
  }

  // ===== Zoom =====

  setZoomLevel(level: number) {
    this.zoomLevel = this.clampZoom(level);
    void this.persistSelectedFilePreferences();
  }

  zoomIn() {
    this.setZoomLevel(this.zoomLevel + editorConfig.zoomStepSize);
  }

  zoomOut() {
    this.setZoomLevel(this.zoomLevel - editorConfig.zoomStepSize);
  }

  // ===== Autoscroll =====

  setAutoscrolling(enabled: boolean) {
    this.isAutoscrolling = enabled;
  }

  toggleAutoscroll() {
    this.isAutoscrolling = !this.isAutoscrolling;
  }

  setAutoscrollSpeed(speed: number) {
    this.autoscrollSpeed = this.clampAutoscrollSpeed(speed);
    void this.persistSelectedFilePreferences();
  }

  increaseAutoscrollSpeed() {
    this.setAutoscrollSpeed(this.autoscrollSpeed + editorConfig.autoscrollStepSize);
  }

  decreaseAutoscrollSpeed() {
    this.setAutoscrollSpeed(this.autoscrollSpeed - editorConfig.autoscrollStepSize);
  }
}

export const editorStore = new EditorStore();

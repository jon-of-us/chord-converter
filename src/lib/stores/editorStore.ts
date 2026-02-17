import { editorConfig } from '../config';

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
  lastSavedContent = $state('');
  isSaving = $state(false);
  saveSuccess = $state(false);
  keyNumber = $state(0);

  // Derived property for hasChanges
  get hasChanges(): boolean {
    return this.editedContent !== this.lastSavedContent;
  }

  // View mode
  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
  }

  // Zoom
  setZoomLevel(level: number) {
    this.zoomLevel = Math.max(editorConfig.minZoom, Math.min(editorConfig.maxZoom, level));
  }

  zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel + 10, editorConfig.maxZoom);
  }

  zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel - 10, editorConfig.minZoom);
  }

  // Autoscroll
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

  // Key
  setKeyNumber(key: number) {
    this.keyNumber = (key % 12 + 12) % 12;
  }

  // Content
  setEditedContent(content: string) {
    this.editedContent = content;
  }

  setLastSavedContent(content: string) {
    this.lastSavedContent = content;
    this.editedContent = content;
  }

  // Combined updates
  loadContent(content: string, keyNumber: number) {
    this.editedContent = content;
    this.lastSavedContent = content;
    this.keyNumber = (keyNumber % 12 + 12) % 12;
  }

  // Save state
  setSaving(saving: boolean) {
    this.isSaving = saving;
  }

  setSaveSuccess(success: boolean) {
    this.saveSuccess = success;
  }

}

export const editorStore = new EditorStore();

// Export hasChanges as a getter that can be used directly
export const hasChanges = $derived(editorStore.hasChanges);

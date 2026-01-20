import * as fileService from './fileService';
import * as metadataService from './metadataService';
import * as fileStore from '../stores/fileStore';
import * as editorStore from '../stores/editorStore';

/**
 * Editor Service
 * Handles editor business logic: file loading, saving, and transposition
 */

/**
 * Load file content into editor
 */
export async function loadFile(file: fileStore.FileEntry): Promise<void> {
  try {
    fileStore.fileStore.setLoading(true);
    const content = await fileService.readFile(file);
    
    // Ensure numeric key and get key number
    const keyResult = metadataService.ensureNumericKey(content);
    const finalContent = keyResult.updated ? keyResult.content : content;
    
    // If key was updated, save it immediately
    if (keyResult.updated) {
      await fileService.saveFile(file, finalContent);
      fileStore.fileStore.setCurrentContent(finalContent);
    } else {
      fileStore.fileStore.setCurrentContent(content);
    }
    
    editorStore.editorStore.loadContent(finalContent, keyResult.keyNumber);
  } catch (error: any) {
    fileStore.fileStore.setError(`Error loading file: ${error.message}`);
    throw error;
  } finally {
    fileStore.fileStore.setLoading(false);
  }
}

/**
 * Save current file content
 */
export async function saveFile(
  file: fileStore.FileEntry, 
  content: string
): Promise<void> {
  try {
    editorStore.editorStore.setSaving(true);
    fileStore.fileStore.setError(null);
    
    await fileService.saveFile(file, content);
    
    fileStore.fileStore.setCurrentContent(content);
    editorStore.editorStore.setLastSavedContent(content);
    editorStore.editorStore.setSaveSuccess(true);
    
    setTimeout(() => {
      editorStore.editorStore.setSaveSuccess(false);
    }, 2000);
  } catch (error: any) {
    fileStore.fileStore.setError(`Error saving file: ${error.message}`);
    throw error;
  } finally {
    editorStore.editorStore.setSaving(false);
  }
}

/**
 * Transpose key by semitone offset
 */
export async function transpose(
  file: fileStore.FileEntry,
  content: string,
  offset: number
): Promise<void> {
  try {
    const result = metadataService.transposeKey(content, offset);
    editorStore.editorStore.setEditedContent(result.content);
    editorStore.editorStore.setKeyNumber(result.keyNumber);
    await saveFile(file, result.content);
  } catch (error: any) {
    console.error('Error transposing:', error);
    throw error;
  }
}

/**
 * Ensure numeric key when switching to structure/chords view
 */
export async function ensureNumericKey(
  file: fileStore.FileEntry,
  content: string
): Promise<void> {
  if (!content) return;
  
  try {
    const keyResult = metadataService.ensureNumericKey(content);
    if (keyResult.updated) {
      editorStore.editorStore.setEditedContent(keyResult.content);
      editorStore.editorStore.setKeyNumber(keyResult.keyNumber);
      await saveFile(file, keyResult.content);
    } else {
      editorStore.editorStore.setKeyNumber(keyResult.keyNumber);
    }
  } catch (error: any) {
    console.error('Error updating key metadata:', error);
    throw error;
  }
}

import { get } from 'svelte/store';
import * as fileService from './fileService';
import * as metadataService from './metadataService';
import * as chordFileService from './chordFileService';
import * as fileStore from '../stores/fileStore';
import * as editorStore from '../stores/editorStore';
import type { ChordFile } from '../models/ChordFile';

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
    
    // Only process metadata for .chords files
    if (file.path.endsWith('.chords')) {
      // Parse and ensure numeric key
      const chordFile = chordFileService.parseChordFile(content);
      const keyResult = metadataService.ensureNumericKey(chordFile);
      const finalContent = keyResult.content;
      
      // If key was updated, save it immediately
      if (keyResult.updated) {
        await fileService.saveFile(file, finalContent);
      }
      
      fileStore.fileStore.setCurrentContent(finalContent);
      editorStore.editorStore.loadContent(finalContent, keyResult.keyNumber);
    } else {
      // For non-.chords files, just load the content as-is
      fileStore.fileStore.setCurrentContent(content);
      editorStore.editorStore.loadContent(content, 0);
    }
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
 * Parses content, transposes, and saves
 */
export async function transpose(
  file: fileStore.FileEntry,
  offset: number
): Promise<void> {
  try {
    // Get current content from store
    const state = get(editorStore.editorStore);
    const content = state.editedContent;
    
    // Parse, transpose, and serialize
    const chordFile = chordFileService.parseChordFile(content);
    const result = metadataService.transposeKey(chordFile, offset);
    
    // Update content and key number
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
  chordFile: ChordFile
): Promise<void> {
  // Only process metadata for .chords files
  if (!file.path.endsWith('.chords')) return;
  
  try {
    const keyResult = metadataService.ensureNumericKey(chordFile);
    if (keyResult.updated) {
      // Update content and key number
      editorStore.editorStore.setEditedContent(keyResult.content);
      editorStore.editorStore.setKeyNumber(keyResult.keyNumber);
      await saveFile(file, keyResult.content);
    } else {
      // Just update key number (content unchanged)
      editorStore.editorStore.setKeyNumber(keyResult.keyNumber);
    }
  } catch (error: any) {
    console.error('Error updating key metadata:', error);
    throw error;
  }
}

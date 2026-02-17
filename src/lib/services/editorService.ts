import { get } from 'svelte/store';
import * as fileService from './fileService';
import * as ChordFileModel from '../models/ChordFile';
import {fileStore, FileEntry} from '../stores/fileStore.svelte';
import {editorStore} from '../stores/editorStore.svelte';

/**
 * Editor Service
 * Handles editor business logic: file loading, saving, and transposition
 */

/**
 * Load file content into editor
 */
export async function loadFile(file: FileEntry): Promise<void> {
  try {
    fileStore.setLoading(true);
    const content = await fileService.readFile(file);
    
    // Only process metadata for .chords files
    if (file.path.endsWith('.chords')) {
      // Parse and ensure numeric key
      const chordFile = ChordFileModel.ChordFile.parse(content);
      const keyNumber = chordFile.ensureNumericKey();
      const finalContent = chordFile.serialize();
      
      // If key was updated, save it immediately
      if (finalContent !== content) {
        await fileService.saveFile(file, finalContent);
      }
      
      fileStore.setCurrentContent(finalContent);
      editorStore.loadContent(finalContent, keyNumber);
    } else {
      // For non-.chords files, just load the content as-is
      fileStore.setCurrentContent(content);
      editorStore.loadContent(content, 0);
    }
  } catch (error: any) {
    fileStore.setError(`Error loading file: ${error.message}`);
    throw error;
  } finally {
    fileStore.setLoading(false);
  }
}

/**
 * Save current file content
 */
export async function saveFile(
  file: FileEntry, 
  content: string
): Promise<void> {
  try {
    editorStore.setSaving(true);
    fileStore.setError(null);
    
    await fileService.saveFile(file, content);
    
    fileStore.setCurrentContent(content);
    editorStore.setLastSavedContent(content);
    editorStore.setSaveSuccess(true);
    
    setTimeout(() => {
      editorStore.setSaveSuccess(false);
    }, 2000);
  } catch (error: any) {
    fileStore.setError(`Error saving file: ${error.message}`);
    throw error;
  } finally {
    editorStore.setSaving(false);
  }
}

/**
 * Transpose key by semitone offset
 * Parses content, transposes, and saves
 */
export async function transpose(
  file: FileEntry,
  offset: number
): Promise<void> {
  try {
    
    // Parse, transpose, and serialize
    const chordFile = ChordFileModel.ChordFile.parse(fileStore.currentContent);
    chordFile.transpose(offset);
    const newContent = chordFile.serialize();
    
    // Update fileStore and save directly
    fileStore.setCurrentContent(newContent);
    await fileService.saveFile(file, newContent);
    
  } catch (error: any) {
    console.error('Error transposing:', error);
    fileStore.setError(`Error transposing: ${error.message}`);
    throw error;
  }
}

/**
 * Ensure numeric key when switching to structure/chords view
 */
export async function ensureNumericKey(
  file: FileEntry,
  chordFile: ChordFileModel.ChordFile
): Promise<void> {
  // Only process metadata for .chords files
  if (!file.path.endsWith('.chords')) return;
  
  try {
    const originalContent = chordFile.serialize();
    const keyNumber = chordFile.ensureNumericKey();
    const newContent = chordFile.serialize();
    
    if (newContent !== originalContent) {
      // Update content and key number
      editorStore.setEditedContent(newContent);
      editorStore.setKeyNumber(keyNumber);
      await saveFile(file, newContent);
    } else {
      // Just update key number (content unchanged)
      editorStore.setKeyNumber(keyNumber);
    }
  } catch (error: any) {
    console.error('Error updating key metadata:', error);
    throw error;
  }
}

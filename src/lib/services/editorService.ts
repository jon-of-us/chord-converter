import { get } from 'svelte/store';
import * as fileService from './fileService';
import * as metadataService from './metadataService';
import * as chordFileService from './chordFileService';
import {fileStore, FileEntry} from '../stores/fileStore.svelte';
import {editorStore} from '../stores/editorStore.svelte';
import type { ChordFile } from '../models/ChordFile';

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
      const chordFile = chordFileService.parseChordFile(content);
      const keyResult = metadataService.ensureNumericKey(chordFile);
      const finalContent = keyResult.content;
      
      // If key was updated, save it immediately
      if (keyResult.updated) {
        await fileService.saveFile(file, finalContent);
      }
      
      fileStore.setCurrentContent(finalContent);
      editorStore.loadContent(finalContent, keyResult.keyNumber);
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
    const chordFile = chordFileService.parseChordFile(fileStore.currentContent);
    const result = metadataService.transposeKey(chordFile, offset);
    
    // Update fileStore and save directly
    fileStore.setCurrentContent(result.content);
    await fileService.saveFile(file, result.content);
    
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
  chordFile: ChordFile
): Promise<void> {
  // Only process metadata for .chords files
  if (!file.path.endsWith('.chords')) return;
  
  try {
    const keyResult = metadataService.ensureNumericKey(chordFile);
    if (keyResult.updated) {
      // Update content and key number
      editorStore.setEditedContent(keyResult.content);
      editorStore.setKeyNumber(keyResult.keyNumber);
      await saveFile(file, keyResult.content);
    } else {
      // Just update key number (content unchanged)
      editorStore.setKeyNumber(keyResult.keyNumber);
    }
  } catch (error: any) {
    console.error('Error updating key metadata:', error);
    throw error;
  }
}

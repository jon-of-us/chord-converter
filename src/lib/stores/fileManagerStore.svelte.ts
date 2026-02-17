import type { FileEntry } from './fileStore.svelte';
import type { IFileStorage } from '../storage/IFileStorage';

/**
 * File Manager Store
 * Manages UI state for the file tree (expanded folders, editing, selection)
 * and caches the content of the selected file
 */

export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: FileEntry;
  children: TreeNode[];
}

class FileManagerStore {
  expandedFolders = $state(new Set<string>());
  renamingPath = $state<string | null>(null);
  renamingValue = $state('');
  selectedPath = $state<string | null>(null);
  cachedContent = $state('');

  // ===== Tree Building =====

  /**
   * Build tree structure from files and folders
   */
  buildFileTree(files: FileEntry[], folders: Set<string>): TreeNode[] {
    const root: TreeNode[] = [];
    const folderMap = new Map<string, TreeNode>();

    // Create folder nodes
    for (const folderPath of folders) {
      const parts = folderPath.split('/');
      let currentLevel = root;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

        if (!folderMap.has(currentPath)) {
          const folderNode: TreeNode = {
            name: parts[i],
            path: currentPath,
            isFolder: true,
            children: [],
          };
          folderMap.set(currentPath, folderNode);
          currentLevel.push(folderNode);
        }

        currentLevel = folderMap.get(currentPath)!.children;
      }
    }

    // Add files
    for (const file of files) {
      const parts = file.path.split('/');
      let currentLevel = root;
      let currentPath = '';

      // Navigate to parent folder
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

        if (!folderMap.has(currentPath)) {
          const folderNode: TreeNode = {
            name: parts[i],
            path: currentPath,
            isFolder: true,
            children: [],
          };
          folderMap.set(currentPath, folderNode);
          currentLevel.push(folderNode);
        }

        currentLevel = folderMap.get(currentPath)!.children;
      }

      // Add file node
      currentLevel.push({
        name: file.name,
        path: file.path,
        isFolder: false,
        file,
        children: [],
      });
    }

    return root;
  }

  // ===== Folder Expansion =====

  toggleFolder(path: string) {
    const newExpanded = new Set(this.expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    this.expandedFolders = newExpanded;
    this.selectedPath = path;
  }

  // ===== Selection =====

  select(path: string | null) {
    this.selectedPath = path;
  }

  /**
   * Get the selected file (returns null if folder or nothing selected)
   */
  getSelectedFile(files: FileEntry[]): FileEntry | null {
    if (!this.selectedPath) return null;
    return files.find(f => f.path === this.selectedPath) || null;
  }

  /**
   * Load content for selected file and cache it
   */
  async loadSelectedContent(files: FileEntry[], storage: IFileStorage): Promise<void> {
    const file = this.getSelectedFile(files);
    if (!file) {
      this.cachedContent = '';
      return;
    }
    
    try {
      const content = await storage.readFile(file);
      this.cachedContent = content;
    } catch (error) {
      console.error('Error loading file content:', error);
      this.cachedContent = '';
      throw error;
    }
  }

  /**
   * Update cached content (after save)
   */
  updateCachedContent(content: string): void {
    this.cachedContent = content;
  }

  /**
   * Get folder context for creating new files
   */
  getSelectedFolderPath(files: FileEntry[]): string {
    if (!this.selectedPath) return '';

    // Check if selected path is a file
    const selectedFile = files.find(f => f.path === this.selectedPath);
    if (selectedFile) {
      // Extract folder from file path
      const parts = selectedFile.path.split('/');
      parts.pop(); // Remove filename
      return parts.join('/');
    }

    // Otherwise it's a folder path
    return this.selectedPath;
  }

  // ===== Editing =====

  startEditing(path: string, currentName: string) {
    this.renamingPath = path;
    this.renamingValue = currentName;
  }

  updateEditingValue(value: string) {
    this.renamingValue = value;
  }

  cancelEditing() {
    this.renamingPath = null;
    this.renamingValue = '';
  }
}

export const fileManagerStore = new FileManagerStore();

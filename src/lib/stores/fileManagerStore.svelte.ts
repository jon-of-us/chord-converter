import type { FileEntry } from './fileStore.svelte';

/**
 * File Manager Store
 * Manages UI state for the file tree (expanded folders, editing, selection)
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

  expandFolder(path: string) {
    const newExpanded = new Set(this.expandedFolders);
    newExpanded.add(path);
    this.expandedFolders = newExpanded;
  }

  collapseFolder(path: string) {
    const newExpanded = new Set(this.expandedFolders);
    newExpanded.delete(path);
    this.expandedFolders = newExpanded;
  }

  expandPath(path: string) {
    const newExpanded = new Set(this.expandedFolders);
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/');
      if (folderPath) newExpanded.add(folderPath);
    }
    this.expandedFolders = newExpanded;
  }

  // ===== Selection =====

  select(path: string | null) {
    this.selectedPath = path;
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

  // ===== Reset =====

  reset() {
    this.expandedFolders = new Set<string>();
    this.renamingPath = null;
    this.renamingValue = '';
    this.selectedPath = null;
  }
}

export const fileManagerStore = new FileManagerStore();

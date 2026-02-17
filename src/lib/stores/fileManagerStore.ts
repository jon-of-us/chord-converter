/**
 * File Manager Store
 * Manages UI state for the file tree (expanded folders, editing, selection)
 */

class FileManagerStore {
  expandedFolders = $state(new Set<string>());
  renamingPath = $state<string | null>(null);
  renamingValue = $state('');
  selectedPath = $state<string | null>(null);

  // Folder expansion
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

  // Selection (file or folder)
  select(path: string | null) {
    this.selectedPath = path;
  }

  // Get folder context for creating new files
  getSelectedFolderPath(files: any[]): string {
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

  // Editing
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

  // Reset
  reset() {
    this.expandedFolders = new Set<string>();
    this.renamingPath = null;
    this.renamingValue = '';
    this.selectedPath = null;
  }
}

export const fileManagerStore = new FileManagerStore();

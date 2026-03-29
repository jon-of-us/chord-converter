const DB_NAME = 'ChordConverterDB';
const DB_VERSION = 3;
const HANDLE_STORE_NAME = 'folderHandles';
const FILES_STORE_NAME = 'files';
const PREFERENCES_STORE_NAME = 'filePreferences';
const HANDLE_KEY = 'selectedFolder';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
        db.createObjectStore(FILES_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(PREFERENCES_STORE_NAME)) {
        db.createObjectStore(PREFERENCES_STORE_NAME);
      }
    };
  });
}

export async function saveFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    
    store.put(handle, HANDLE_KEY);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error saving folder handle:', error);
    throw error;
  }
}

export async function loadFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(HANDLE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    const request = store.get(HANDLE_KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error loading folder handle:', error);
    return null;
  }
}

export async function clearFolderHandle(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    
    store.delete(HANDLE_KEY);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error clearing folder handle:', error);
    throw error;
  }
}

// Browser storage functions
export interface BrowserFile {
  name: string;
  content: string;
}

export async function saveBrowserFile(name: string, content: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FILES_STORE_NAME);
    
    store.put({ name, content }, name);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error saving browser file:', error);
    throw error;
  }
}

export async function loadBrowserFile(name: string): Promise<BrowserFile | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(FILES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.get(name);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error loading browser file:', error);
    return null;
  }
}

export async function loadAllBrowserFiles(): Promise<BrowserFile[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(FILES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error loading all browser files:', error);
    return [];
  }
}

export async function deleteBrowserFile(name: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FILES_STORE_NAME);
    
    store.delete(name);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error deleting browser file:', error);
    throw error;
  }
}

export async function renameBrowserFile(oldName: string, newName: string): Promise<void> {
  try {
    const file = await loadBrowserFile(oldName);
    if (!file) throw new Error('File not found');
    
    await saveBrowserFile(newName, file.content);
    await deleteBrowserFile(oldName);
  } catch (error) {
    console.error('Error renaming browser file:', error);
    throw error;
  }
}

export interface FilePreferences {
  zoom: number;
  scrollSpeed: number;
  bassMode?: 'add-bass' | 'invert-bass';
}

export async function saveFilePreferences(path: string, preferences: FilePreferences): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(PREFERENCES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PREFERENCES_STORE_NAME);

    store.put(preferences, path);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error saving file preferences:', error);
    throw error;
  }
}

export async function loadFilePreferences(path: string): Promise<FilePreferences | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(PREFERENCES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PREFERENCES_STORE_NAME);
    const request = store.get(path);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error loading file preferences:', error);
    return null;
  }
}

export async function deleteFilePreferences(path: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(PREFERENCES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PREFERENCES_STORE_NAME);

    store.delete(path);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error deleting file preferences:', error);
    throw error;
  }
}

export async function renameFilePreferences(oldPath: string, newPath: string): Promise<void> {
  try {
    const preferences = await loadFilePreferences(oldPath);
    if (!preferences) {
      return;
    }

    await saveFilePreferences(newPath, preferences);
    await deleteFilePreferences(oldPath);
  } catch (error) {
    console.error('Error renaming file preferences:', error);
    throw error;
  }
}

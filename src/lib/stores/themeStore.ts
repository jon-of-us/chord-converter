import { writable } from 'svelte/store';
import { themeConfig } from '../config';

type Theme = 'dark' | 'light';

// Initialize theme from localStorage or use default
function createThemeStore() {
  const storedTheme = typeof window !== 'undefined' 
    ? localStorage.getItem(themeConfig.storageKey) 
    : null;
  
  const initialTheme: Theme = (storedTheme as Theme) || themeConfig.defaultTheme;
  const { subscribe, set, update } = writable<Theme>(initialTheme);

  return {
    subscribe,
    set: (theme: Theme) => {
      localStorage.setItem(themeConfig.storageKey, theme);
      set(theme);
    },
    toggle: () => {
      update(theme => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(themeConfig.storageKey, newTheme);
        return newTheme;
      });
    }
  };
}

export const themeStore = createThemeStore();

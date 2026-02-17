import { themeConfig } from '../config';

type Theme = 'dark' | 'light';

class ThemeStore {
  theme = $state<Theme>(this.getInitialTheme());

  getInitialTheme(): Theme {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem(themeConfig.storageKey);
      return (storedTheme as Theme) || themeConfig.defaultTheme;
    }
    return themeConfig.defaultTheme;
  }

  get current(): Theme {
    return this.theme;
  }

  set(theme: Theme) {
    this.theme = theme;
    if (typeof window !== 'undefined') {
      localStorage.setItem(themeConfig.storageKey, theme);
    }
  }

  toggle() {
    const newTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.set(newTheme);
  }
}

export const themeStore = new ThemeStore();

// UI Colors - Primary accent colors
export const colors = {
  // Primary accent (used for buttons, active states, links)
  primaryAccent: '#646cff',
  primaryAccentHover: '#535bf2',
  
  // Status colors
  success: '#4caf50',
  error: '#ff6b6b',
  
  // Text colors
  textPrimary: 'rgba(255, 255, 255, 0.87)',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',
};

// File settings
export const fileConfig = {
  extension: '.chords',
  defaultTitle: '',
  defaultArtist: '',
  defaultKey: '',
  defaultInfo: '',
  // Template for new .chords files (with blank lines separating metadata from content)
  newFileTemplate: `Title: 
Artist: 
Key: 

`,
};

// Editor controls settings
export const editorConfig = {
  // Zoom levels
  minZoom: 50,
  maxZoom: 250,
  defaultZoom: 100,
  
  // Autoscroll settings
  minAutoscrollSpeed: 0.1,
  maxAutoscrollSpeed: 5,
  defaultAutoscrollSpeed: 1,
  autoscrollStepSize: 0.1,
  autoscrollPixelsPerSecond: 5, // Base scroll speed at 1.0x 
};

// Sidebar styling - permanently dark mode
export const sidebarConfig = {
  // Left sidebar (file manager)
  leftSidebarBg: '#2a2a2a',
  leftSidebarBorder: '#3a3a3a',
  leftSidebarText: '#ffffff',
  
  // Right sidebar (editor controls)
  rightSidebarBg: '#2a2a2a',
  rightSidebarBorder: '#3a3a3a',
  rightSidebarText: '#ffffff',
};

// Theme settings
export const themeConfig = {
  defaultTheme: 'dark' as 'dark' | 'light',
  storageKey: 'chord-converter-theme',
};

export const mobileMessage = "This application does not support mobile devices. Please use a desktop browser (preferably Chrome or Edge)"
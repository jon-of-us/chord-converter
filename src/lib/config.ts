// Theme colors
export const colors = {
  primary: '#646cff',
  primaryHover: '#535bf2',
  primaryDark: '#4a52d9',
  
  success: '#4caf50',
  error: '#ff6b6b',
  errorBg: 'rgba(255, 50, 50, 0.2)',
  errorBorder: '#ff6b6b',
  
  textPrimary: 'rgba(255, 255, 255, 0.87)',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',
  
  bgPrimary: 'rgba(255, 255, 255, 0.05)',
  bgSecondary: 'rgba(255, 255, 255, 0.03)',
  bgHover: 'rgba(255, 255, 255, 0.05)',
  bgSelected: 'rgba(100, 108, 255, 0.15)',
  bgInput: 'rgba(255, 255, 255, 0.1)',
  bgDark: 'rgba(0, 0, 0, 0.2)',
  
  border: 'rgba(255, 255, 255, 0.1)',
  borderPrimary: 'rgba(100, 108, 255, 0.3)',
  borderHover: 'rgba(100, 108, 255, 0.5)',
  
  modifiedIndicator: '#646cff',
};

// File settings
export const fileConfig = {
  extension: '.chords',
  defaultTitle: '',
  defaultArtist: '',
  defaultKey: '',
  defaultInfo: '',
  // Template for new files
  newFileTemplate: `Title: Test 
Key: 
Artist: 
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

// Theme settings
export const themeConfig = {
  defaultTheme: 'dark' as 'dark' | 'light',
  storageKey: 'chord-converter-theme',
};

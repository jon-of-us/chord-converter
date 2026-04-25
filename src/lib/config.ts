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

// Default file created on first launch
export const defaultFile = {
  name: 'fly_me_to_the_moon.chords',
  content: `Title: Fly me to the moon
Artist: Frank Sinatra
Key: 4


[Verse]

Am7            Dm7
Fly me to the moon
       G7             Cmaj7
Let me play among the stars
F               Dm
Let me see what spring is like on,
  E7         Am7
A Jupiter and Mars


[Chorus]

   Dm7          G7          C     Am
In other words,    hold my hand
   Dm7          G7       C        E7
In other words,    baby kiss me


[Verse]

Am7                Dm7
Fill my heart with song
       G7            Cmaj7
Let me sing for ever more
F             Dm
You are all I long for
      E7          Am7
All I worship and adore


[Chorus]

   Dm7          G7            C     Am
In other words,    please be true
   Dm7          G7     C     E7
In other words, I love you


[Verse]

Am7                Dm7
Fill my heart with song
       G7            Cmaj7
Let me sing for ever more
F             Dm
You are all I long for
      E7          Am7
All I worship and adore


[Chorus]

   Dm7          G7            C     Am
In other words,    please be true
   Dm7         G7    Gm7 G7       C
In other words       I love ... you
`,
};

// Editor controls settings
export const editorConfig = {
  // Zoom in rem
  minZoom: 0.5,
  maxZoom: 2.5,
  defaultZoom: 1,
  zoomStepSize: 0.1,
  
  // Autoscroll speed in rem/s
  minAutoscrollSpeed: 0.05,
  maxAutoscrollSpeed: 1.6,
  defaultAutoscrollSpeed: 0.3,
  autoscrollStepSize: 0.03,
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
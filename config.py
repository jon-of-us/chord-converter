import numpy as np

# SVG Dimensions and Layout
WIDTH = 100
HEIGHT = 100
PADDING = 10

# Points
GRID_COLOR = "white"
GRID_RAD = 0
CHORD_COLOR = "#333333"
CHORD_RAD = 2
TONIC_COLOR = "gray"
TONIC_RAD = 4
BASS_SIDELENGTH = CHORD_RAD * 2 + 2

# Lines
LINE_WIDTH = 2

# Grid spacing and layout
HORIZONTAL_DISTANCE = 20
VERTICAL_DISTANCE = 17
ROW_SHIFT = -14

N_COLS = 11
N_ROWS = 5

# html 
MAX_LINE_LENGTH = 120  
CSS = """
body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; line-height: 1.4; }
pre { margin: 0.01rem; white-space: pre; }
.heading {font-weight: 700; }
.subheading {font-weight: 400; }
.section { margin: 0.75rem 0; }
.marker { position: relative; display: inline-block; width: 0; height: 0; overflow: visible; }
.marker > img.chord-icon, .marker > svg.chord-icon { position: absolute; left: 0; bottom: 0; height: 1.1em; }
.subheading { font-weight: 700; }

/* chord overlay system */
.chord-line { position: relative; }
.chord-line pre.lyrics { position: relative; z-index: 1; }
.chord-markers { position: relative; }

/* invisible markers occupying a zero-width inline-block at chord start */
.chord-marker { width:0; height:0; display:inline-block; position:relative; overflow:visible; }

/* floating chord/word labels rendered in separate absolutely positioned pre elements */
.word-chord { position:absolute; top:0; left:0; margin:0; padding:0; font-weight:600; pointer-events:none; white-space:pre; }
.word-layer { position:absolute; left:0; right:0; top:0; height:0; }

/* allow spacing to avoid overlap with preceding section */
.chord-line-wrapper { position:relative; margin:0; padding:0; }

/* optional debug style (disabled by default) */
.chord-marker { outline:2px solid rgba(200,0,0,0.3); } 

"""
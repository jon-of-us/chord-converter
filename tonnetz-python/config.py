import numpy as np

OUTPUT_FOLDER =  "/mnt/c/Users/Jonas/Desktop/akkorde_tonnetz"
# OUTPUT_FOLDER =  "output"

# Points
GRID_COLOR = "white"
GRID_RAD = 00
CHORD_COLOR = "#333333"
CHORD_RAD = 70
TONIC_COLOR = "#BDBDBD"
TONIC_RAD = 90
# BASS_SIDELENGTH = CHORD_RAD * 2 + 20
# BASS_SIDELENGTH = TONIC_RAD * 2 - 10
BASS_INNER_RAD = TONIC_RAD * 0.3
BASS_INNER_COLOR = "white"

# SVG Dimensions and Layout
PADDING = 5 + max(CHORD_RAD, TONIC_RAD)

# Lines
LINE_WIDTH = 50

# Grid spacing and layout
HORIZONTAL_DISTANCE = 200
VERTICAL_DISTANCE = HORIZONTAL_DISTANCE * np.sqrt(3) / 2
ROW_SHIFT = -HORIZONTAL_DISTANCE / 2

N_COLS = 11
N_ROWS = 5

# Chord icon layout
CHORD_ICON_GAP = 10  # px minimal horizontal gap between consecutive chord icons
TONIC_POINT_INDICES = [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)] # first tonic pioint is used to center the svg vertically
# TONIC_POINT_INDICES = [(0, 1) (1, 1)]

# html 
CSS = """
body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; line-height: 1.4; }
pre { margin: 0.01rem; white-space: pre; }
.heading {font-weight: 700; padding-top: 1rem; padding-bottom: 0.5rem; }
.subheading {font-weight: 400; padding-top: 1rem; }
.section { margin: 0.75rem 0; }
.marker { position: relative; display: inline-block; width: 0; height: 0; overflow: visible; }
.marker > img.chord-icon, .marker > svg.chord-icon { position: absolute; left: 0; bottom: -1.4em; height: 3.2em; overflow: visible; }
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
/* .chord-marker { outline:2px solid rgba(200,0,0,0.3); } */

"""
"""
Parse chord/lyrics text files and replace chord names with SVG icons aligned to the text below.

Approach, inspired by old_code/file_to_objects.py:
- Detect line types (heading, subheading, chords, lyrics, empty)
- For a chords line, compute character positions of each chord token
- If the next line is lyrics, insert invisible markers at those positions in the lyrics line.
  Each marker contains the chord SVG, absolutely positioned above the text baseline.
- If no lyrics line follows, create an empty line and place markers there.
- Use monospace font to keep positional alignment deterministic.

Chord recognition uses old_code/read_chord.chord_from_word for validation.
Chord SVG selection:
- Load chord definitions from chords.yaml and match by alias (rest part of the chord string)
- Generate an SVG filename via chord_to_svg.generate_chord_filename(root=1, chord=def, bass=0)
- Generate the SVG on demand if it doesn't exist (root fixed to 1 to show chord quality/shape)

Note: Slash-chord bass is ignored for icon generation at this stage (bass=0),
as visualizing chord quality above the lyric is the primary goal here.
"""

from __future__ import annotations

import os
import sys
from typing import List, Tuple, Optional, Dict, Any

import yaml

# Reuse chord parsing/recognition logic from old code
from old_code.read_chord import chord_from_word as read_chord_from_word

# Icon generation utilities
import chord_to_svg


# --- Line classification (inspired by old code) ---------------------------------

def _line_type(line: str) -> str:
    s = line.strip()
    if len(s) == 0:
        return "empty"
    if s.startswith("["):
        return "subheading"
    # chord density heuristic
    split = line.split(" ")
    split = [w for w in split if w != ""]
    if not split:
        return "empty"
    words_no_slash = [w.split("/")[0] for w in split]
    n_words = len(words_no_slash)
    is_chord = [read_chord_from_word(w) is not None for w in words_no_slash]
    n_chords = sum(is_chord)
    if n_chords / max(1, n_words) > 0.4:
        return "chords"
    return "lyrics"


# --- Chord alias mapping from chords.yaml --------------------------------------

def _load_chord_defs(yaml_path: str = "chords.yaml") -> List[Dict[str, Any]]:
    with open(yaml_path, "r") as f:
        data = yaml.safe_load(f)
    return data.get("chords", [])


def _alias_to_chord_def(alias: str, chord_defs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    # Find chord def where alias matches exactly
    for ch in chord_defs:
        aliases = ch.get("aliases", [])
        if alias in aliases:
            return ch
    return None


# --- Parsing chord tokens and positions ----------------------------------------

# Recreate the note root detection used in old_code.read_chord so we can get the 'rest' alias
_c1 = ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"]
_c2 = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]
_old_chords = _c1 + _c2

# Sort by length desc so sharps/flats are matched before naturals
_sorted_roots = sorted(_old_chords, key=lambda x: len(x), reverse=True)


def _split_root_and_rest(token: str) -> Optional[Tuple[str, str]]:
    """Return (root_str, rest_alias) if token looks like a chord, else None.
    E.g. "G7" -> ("G", "7"), "Am" -> ("A", "m"), "C" -> ("C", "").
    """
    lead = token.split("/")[0]
    for root in _sorted_roots:
        if lead.startswith(root):
            return root, lead[len(root) :]
    return None


def _token_positions(line: str) -> Tuple[List[int], List[str]]:
    """Return character start indices and raw tokens for non-empty items split by spaces."""
    parts = line.split(" ")
    lengths = [len(p) for p in parts]
    # positions count spaces between items
    positions = [sum(lengths[:i]) + i for i in range(len(lengths))]
    tokens = [p for p in parts]
    return positions, tokens


# --- Marker insertion -----------------------------------------------------------

def _insert_markers(text: str, inserts: List[Tuple[int, str]]) -> str:
    """Insert HTML snippets at specific character indices in text.
    Inserts must be a list of (index, html). Later inserts won't shift earlier positions
    if we apply from right to left.
    """
    if not inserts:
        return text
    chars = list(text)
    # sort descending by index
    for idx, html in sorted(inserts, key=lambda x: x[0], reverse=True):
        idx_clamped = max(0, min(idx, len(chars)))
        chars[idx_clamped:idx_clamped] = [html]
    return "".join(chars)


# --- HTML generation ------------------------------------------------------------

_BASE_CSS = """
body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; line-height: 1.4; }
pre { margin: 0.25rem 0; white-space: pre; }
.section { margin: 0.75rem 0; }
.marker { position: relative; display: inline-block; width: 0; height: 0; overflow: visible; }
.marker > img.chord-icon { position: absolute; left: 0; bottom: calc(100% + 4px); height: 1.1em; }
.subheading { font-weight: 700; }
"""


def _html_head(title: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{title}</title>
    <style>{_BASE_CSS}</style>
  </head>
  <body>
"""


def _html_tail() -> str:
    return "\n  </body>\n</html>\n"


def _img_for_chord(alias: str, chord_defs: List[Dict[str, Any]]) -> Optional[str]:
    ch_def = _alias_to_chord_def(alias, chord_defs)
    if ch_def is None:
        return None

    # Root fixed to 1 for consistent relative shape; bass not visualized yet
    filename = chord_to_svg.generate_chord_filename(root=1, chord=ch_def, bass=0)
    filepath = os.path.join("chord_icons", filename)
    # Only use pre-generated icons; if missing, skip
    if not os.path.exists(filepath):
        sys.stderr.write(f"Icon missing, skipping: {filepath}\n")
        return None
    # Return HTML <img>
    safe_alt = alias if alias else "maj"
    return f"<img class=\"chord-icon\" src=\"{filepath}\" alt=\"{safe_alt}\" />"


def parse_file_to_html(input_path: str) -> str:
    with open(input_path, "r", encoding="utf-8") as f:
        lines = [ln.rstrip("\n") for ln in f.readlines()]

    chord_defs = _load_chord_defs()

    out: List[str] = []
    title = os.path.splitext(os.path.basename(input_path))[0]
    out.append(_html_head(title))

    i = 0
    while i < len(lines):
        line = lines[i]
        if i == 0:
            # Heading: first line
            out.append(f"<h2>{line}</h2>")
            i += 1
            continue

        ltype = _line_type(line)
        if ltype == "empty":
            out.append("<div class=\"section\"></div>")
            i += 1
            continue

        if ltype == "subheading":
            out.append(f"<div class=\"subheading\">{line}</div>")
            i += 1
            continue

        if ltype == "lyrics":
            # Output the lyrics line as-is
            out.append(f"<pre>{line}</pre>")
            i += 1
            continue

        if ltype == "chords":
            # Compute positions of chord tokens
            positions, tokens = _token_positions(line)
            marker_inserts: List[Tuple[int, str]] = []

            for pos, tok in zip(positions, tokens):
                if not tok:
                    continue
                # Only use the token if recognizably a chord
                if read_chord_from_word(tok) is None:
                    continue
                split = _split_root_and_rest(tok)
                if split is None:
                    continue
                _root_str, rest_alias = split
                # Map alias to chord definition
                img_html = _img_for_chord(rest_alias, chord_defs)
                if img_html is None:
                    # Try empty alias (major) if rest is empty or unknown
                    fallback_alias = rest_alias if rest_alias else ""
                    img_html = _img_for_chord(fallback_alias, chord_defs)
                if img_html is None:
                    # If still None, skip this chord icon
                    continue
                marker_html = f"<span class=\"marker\">{img_html}</span>"
                marker_inserts.append((pos, marker_html))

            # Determine the lyrics line below (if any)
            next_is_lyrics = (i + 1 < len(lines)) and (_line_type(lines[i + 1]) == "lyrics")
            if next_is_lyrics:
                lyrics_line = lines[i + 1]
                updated = _insert_markers(lyrics_line, marker_inserts)
                out.append(f"<pre>{updated}</pre>")
                i += 2  # consume both lines
            else:
                # No lyrics below: create an empty baseline just for markers
                updated = _insert_markers("", marker_inserts)
                out.append(f"<pre>{updated}</pre>")
                i += 1
            continue

        # Fallback: output raw line
        out.append(f"<pre>{line}</pre>")
        i += 1

    out.append(_html_tail())
    return "\n".join(out)


def main(argv: List[str]) -> int:
    # Convert all .txt files in ./input to HTML in ./output
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.join(base_dir, "input")
    output_dir = os.path.join(base_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.isdir(input_dir):
        print(f"Input folder not found: {input_dir}")
        return 2

    entries = sorted(os.listdir(input_dir))
    any_done = False
    for name in entries:
        in_path = os.path.join(input_dir, name)
        if not os.path.isfile(in_path):
            continue
        if not name.lower().endswith(".txt"):
            continue
        html = parse_file_to_html(in_path)
        base = os.path.splitext(name)[0]
        out_path = os.path.join(output_dir, f"{base}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Wrote {out_path}")
        any_done = True

    if not any_done:
        print(f"No .txt files found in {input_dir}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))


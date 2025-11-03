# %% IMPORTS
import os
import sys
from types import SimpleNamespace
from typing import List, Tuple, Optional, Dict, Any
import config
import read_chord
import chord_to_svg
import numpy as np



# %% PARSE TO HTML


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
    is_chord = [read_chord.from_word(w) is not None for w in words_no_slash]
    n_chords = sum(is_chord)
    if n_chords / max(1, n_words) > 0.4:
        return "chords"
    return "lyrics"


class ChordOrWord:
    def __init__(self, pos: Tuple[int, int], content: Any, is_chord: bool):
        self.pos = pos  # (line index, position in line)
        self.content = content  # either a Chord object or a string (word)
        self.is_chord = is_chord


def _transpose_to_c_major(chords_or_words: List[ChordOrWord]) -> List[ChordOrWord]:
    note_count = np.zeros(12, dtype=float)
    for chord in chords_or_words:
        if not chord.is_chord:
            continue
        chord = chord.content
        for interval in chord.type["intervals"]:
            note = (chord.root + interval * 7) % 12
            note_count[note] += 1
        note_count[(chord.root + chord.bass * 7) % 12] += 1  # base double weight

    weights = np.array([ 10.,   0.,   4., 174., 265., 231., 139., 221., 180., 100.,   6., 2.])  # with base count double / from hooktheory.com analysis

    # weights = np.array([ 10.,   0.,   2., 101., 197., 158., 107., 163., 153., 100.,   6., 2.])  #  without base count double / from hooktheory.com analysis
    scores = np.convolve(np.tile(note_count, 2), weights[::-1])
    scores = scores[11:23]
    offset_to_c = np.argmax(scores)
    for chord_or_word in chords_or_words:
        if not chord_or_word.is_chord:
            continue
        chord_or_word.content.root = (
            chord_or_word.content.root - offset_to_c + 12
        ) % 12
        # print(chord_or_word.content.root)
    return chords_or_words


def parse_file_to_html(input_path: str) -> str:
    with open(input_path, "r", encoding="utf-8") as f:
        lines = [ln.rstrip("\n") for ln in f.readlines()]

    # %% preprocessing
    lines = [line for line in lines if not line.strip() == ""]
    line_types = [_line_type(ln) for ln in lines]

    # %% extract chords, replace chord lines by whitespaces
    """also contains words in chords lines"""
    chords_or_words: List[ChordOrWord] = []
    chords_in_line: List[List[int]] = [[] for _ in range(len(lines))]
    for i, (line, ltype) in enumerate(zip(lines, line_types)):
        if ltype != "chords":
            continue
        split = line.split(" ")
        idx_in_line = 0
        for tok in split:
            if tok == "":
                idx_in_line += 1
                continue
            # add chord
            parsed = read_chord.from_word(tok)
            content = parsed or tok
            if parsed is not None: 
                pass

            chords_in_line[i].append(len(chords_or_words))
            chords_or_words.append(
                ChordOrWord(
                    pos=(i, idx_in_line),
                    content=content,
                    is_chord=parsed is not None,
                )
            )
            idx_in_line += len(tok) + 1  # +1 for space
    chords_or_words = _transpose_to_c_major(chords_or_words)

    # %% create html
    title = os.path.splitext(os.path.basename(input_path))[0]
    out: List[str] = []
    out.append(
        f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{title}</title>
    <style>{config.CSS}</style>
  </head>
  <body>
"""
    )

    for i, (line, ltype) in enumerate(zip(lines, line_types)):
        if i == 0:
            # Heading: first line
            out.append(f"<div class='heading'>{line}</div>")
        elif ltype == "subheading":
            out.append(f'<div class="subheading">{line}</div>')
        elif ltype == "lyrics":
            out.append(f"<pre class='lyrics'>{line}</pre>")
        elif ltype == "chords":
            # Build a base line of spaces; markers inserted at chord/word start positions
            cows = [chords_or_words[idx] for idx in chords_in_line[i]]
            # Determine max length to pre-allocate (use config.MAX_LINE_LENGTH as cap)
            max_pos = 0
            for cow in cows:
                _, col = cow.pos
                max_pos = max(max_pos, col)
            base_chars = [" "] * (max_pos + 2)
            # Insert zero-width span markers after ensuring preceding spaces exist
            # We'll create html by iterating through characters and injecting markers where needed
            markers_at_col: Dict[int, List[Tuple[str, ChordOrWord]]] = {}
            # cache: (root, intervals tuple, bass) -> svg
            svg_cache: Dict[tuple, str] = {}
            for idx_cow, cow in enumerate(cows):
                line_idx, col = cow.pos
                marker_id = f"mk-{line_idx}-{col}"
                markers_at_col.setdefault(col, []).append((marker_id, cow))
            chord_line_html_parts: List[str] = []
            for col in range(len(base_chars)):
                if col in markers_at_col:
                    for mid, cow in markers_at_col[col]:
                        if cow.is_chord:
                            chord_obj = cow.content
                            key = (
                                chord_obj.root,
                                tuple(chord_obj.type["intervals"]),
                                chord_obj.bass,
                            )
                            if key not in svg_cache:
                                # Build a pseudo chord dict for svg helper
                                chord_obj.root -= 3  # transpose to C major for display
                                if chord_obj.type.get("name") == "Suspended 4th":
                                    pass
                                svg_cache[key] = chord_to_svg.generate_chord_svg_string(
                                    chord_obj
                                )
                            svg_markup = svg_cache[key]
                            chord_line_html_parts.append(
                                f"<span class='marker chord-marker' id='{mid}'>{svg_markup}</span>"
                            )
                        else:
                            chord_line_html_parts.append(
                                f"<span class='marker chord-marker' id='{mid}'></span>"
                            )
                chord_line_html_parts.append(base_chars[col])
            chord_line_html = "".join(chord_line_html_parts).rstrip()
            # Wrap in container; overlay words/chords will be separate absolutely positioned <pre>
            out.append("<div class='chord-line-wrapper'>")
            out.append(f"<pre class='lyrics chord-markers'>{chord_line_html}</pre>")
            # Add overlay elements (only for words for now; chords could later have icons)
            for cow in cows:
                line_idx, col = cow.pos
                marker_id = f"mk-{line_idx}-{col}"
                if cow.is_chord:
                    # Display nothing now, but could add icon via JS (keeping span as marker only)
                    continue
                text = cow.content
                safe_text = (
                    str(text)
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                )
                out.append(
                    f"<pre class='word-chord' data-marker='{marker_id}'>{safe_text}</pre>"
                )
            out.append("</div>")
    out.append("</body>\n</html>")
    # Inject JS right before tail (simple alignment script)
    script = """
<script>
// Align overlay chord words above marker spans
function alignChordWords() {
    const items = document.querySelectorAll('.word-chord');
    items.forEach(el => {
        const markerId = el.getAttribute('data-marker');
        const marker = document.getElementById(markerId);
        if (!marker) return;
        const markerRect = marker.getBoundingClientRect();
        const containerRect = marker.closest('.chord-line-wrapper').getBoundingClientRect();
        const left = markerRect.left - containerRect.left;
        el.style.transform = `translate(${left}px, 0)`; // horizontally align above marker
    });
}

// Shift chord SVGs right to avoid overlap when markers are close together
function alignChordIcons() {
    const lines = document.querySelectorAll('.chord-line-wrapper');
    const GAP = %d; // px minimal horizontal gap between icons (from config)
    lines.forEach(line => {
        const containerRect = line.getBoundingClientRect();
        const markers = Array.from(line.querySelectorAll('.chord-markers .chord-marker'));
        // Consider only markers that contain an SVG chord icon
        const iconMarkers = markers.filter(m => m.querySelector('svg.chord-icon'));
        // Sort by their natural marker position from left to right
        iconMarkers.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        let lastRight = -Infinity;
        iconMarkers.forEach(m => {
            const svg = m.querySelector('svg.chord-icon');
            if (!svg) return;
            // Reset any previous shift so measurement is consistent
            svg.style.transform = 'translateX(0px)';
            const markerLeft = m.getBoundingClientRect().left - containerRect.left;
            const width = svg.getBoundingClientRect().width;
            let desiredLeft = markerLeft;
            if (markerLeft < lastRight + GAP) {
                desiredLeft = lastRight + GAP;
            }
            const shift = desiredLeft - markerLeft;
            if (shift !== 0) {
                // Only shift horizontally; vertical alignment remains via CSS bottom:0
                svg.style.transform = `translateX(${shift}px)`;
            }
            lastRight = desiredLeft + width;
        });
    });
}

function realignAll() {
    alignChordWords();
    alignChordIcons();
}

window.addEventListener('load', realignAll);
window.addEventListener('resize', realignAll);
</script>
""" % (
        config.CHORD_ICON_GAP
    )
    out.insert(-1, script)
    return "\n".join(out)

# %% MAIN
def main():
    # Convert all .txt files in ./input to HTML in ./output
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.join(base_dir, "input")
    # output_dir = os.path.join(base_dir, "output")
    output_dir = "/mnt/c/Users/Jonas/Desktop/akkorde_tonnetz"
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
    main()

import os
import yaml
import numpy as np
import config as c


def add(tup1, tup2):
    assert len(tup1) == len(tup2), "Tuples must have the same length"
    return tuple(a + b for a, b in zip(tup1, tup2))


def interval_to_index(interval):
    """Convert an interval to a point index on the grid."""
    offset = 3
    qi = (7 * interval + offset) % 12 - offset
    row = qi // 3
    col = qi % 3
    return (row, col)


def generate_chord_filename(root, chord, bass=0):
    """
    - bass is realtive to the chord,
    - root note in the current key/scale (tonika=1)
    """
    intervals_str = "-".join(map(str, chord["intervals"]))
    return f"chord_{root}_{intervals_str}_{bass}.svg"


def generate_chord_svg_string(root, chord, bass=0):
    """
    Return SVG markup (string) for a chord icon.
    Will be displayed in key 1 M
    """
    row_idx, col_idx = np.indices((30, 30), dtype=float)
    row_coords = c.VERTICAL_DISTANCE * row_idx
    col_coords = c.HORIZONTAL_DISTANCE * col_idx + c.ROW_SHIFT * row_idx
    chord_intervals = list(chord.get("intervals", []))
    provided_coords = chord.get("coords")
    chord_point_indices = provided_coords or [
        interval_to_index(i) for i in chord_intervals
    ]
    provided_bass_index = chord.get("bass_coord")
    bass_index = [provided_bass_index or interval_to_index(bass)]
    root_index = interval_to_index(root*7)
    for i in range(len(chord_point_indices)):
        chord_point_indices[i] = add(chord_point_indices[i], root_index)
    for i in range(len(bass_index)):
        bass_index[i] = add(bass_index[i], root_index)
    tonic_point_indices = [idx for idx in c.TONIC_POINT_INDICES]
    drawn_point_indices = [bass_index, chord_point_indices, tonic_point_indices]
    drawn_points = sum(drawn_point_indices, [])
    min_row_idx, min_col_idx = min(r for r, _c in drawn_points), min(
        c for _r, c in drawn_points
    )
    for point_class in drawn_point_indices:
        for j in range(len(point_class)):
            point_class[j] = add(point_class[j], (-min_row_idx, -min_col_idx))
    new_root_index = add(root_index, (-min_row_idx, -min_col_idx))
    drawn_points = sum(drawn_point_indices, [])

    # used_row_coords = [row_coords[r, c] for r, c in drawn_points]
    # min_row, max_row = min(used_row_coords), max(used_row_coords)
    used_col_coords = [col_coords[r, c] for r, c in drawn_points]
    min_col, max_col = min(used_col_coords), max(used_col_coords)
    
    width = max_col - min_col + 2 * c.PADDING

    height = c.VERTICAL_DISTANCE * 5 + 2 * c.PADDING
    row_coords += -(tonic_point_indices[0][0]-2)*c.VERTICAL_DISTANCE + c.PADDING
    # height = max_row - min_row + 2 * c.PADDING

    col_coords += -min_col + c.PADDING

    # Include a viewBox so external CSS scaling keeps (0,0) anchored at the marker's bottom-left.
    # Only use viewBox; omit explicit width/height so CSS height sets scale and width auto-scales via aspect ratio
    svg_content = (
        f'<svg class="chord-icon" viewBox="0 0 {width} {height}" '
        f'data-w="{width}" data-h="{height}" xmlns="http://www.w3.org/2000/svg">\n'
    )

    def draw_circle(svg_content, point_idx, rad, color):
        cx = col_coords[*point_idx]
        cy = row_coords[*point_idx]
        return (
            svg_content + f'  <circle cx="{cx}" cy="{cy}" r="{rad}" fill="{color}" />\n'
        )

    for point_idx in tonic_point_indices:
        svg_content = draw_circle(svg_content, point_idx, c.TONIC_RAD, c.TONIC_COLOR)
    for point_idx in chord_point_indices:
        svg_content = draw_circle(svg_content, point_idx, c.CHORD_RAD, c.CHORD_COLOR)
    cx = col_coords[*bass_index[0]]
    cy = row_coords[*bass_index[0]]
    svg_content += f'  <rect x="{cx - c.BASS_SIDELENGTH/2}" y="{cy - c.BASS_SIDELENGTH/2}" width="{c.BASS_SIDELENGTH}" height="{c.BASS_SIDELENGTH}" fill="{c.CHORD_COLOR}" />\n'
    for i in range(len(chord_point_indices)):
        r1, c1 = chord_point_indices[i]
        x1 = col_coords[r1, c1]
        y1 = row_coords[r1, c1]
        for j in range(i + 1, len(chord_point_indices)):
            r2, c2 = chord_point_indices[j]
            x2 = col_coords[r2, c2]
            y2 = row_coords[r2, c2]
            dist = np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            if dist < 1.5 * c.HORIZONTAL_DISTANCE:
                svg_content += f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c.CHORD_COLOR}" stroke-width="{c.LINE_WIDTH}" />\n'
    svg_content += "</svg>"
    return svg_content


def generate_chord_svg(root, chord, bass=0):
    """Generate SVG file for chord by delegating to string function (no duplicated logic)."""
    svg_content = generate_chord_svg_string(root, chord, bass)
    output_dir = "chord_icons"
    os.makedirs(output_dir, exist_ok=True)
    filename = generate_chord_filename(root, chord, bass)
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w") as f:
        f.write(svg_content)
    print(f"Generated SVG: {filepath}")


if __name__ == "__main__":
    # Load the chords from the YAML file
    try:
        with open("chords.yaml", "r") as f:
            chords_data = yaml.safe_load(f)
            all_chords = chords_data.get("chords", [])
    except FileNotFoundError:
        print("Error: chords.yaml not found. Please ensure the file exists.")
        all_chords = []
    except Exception as e:
        print(f"An error occurred while reading or parsing chords.yaml: {e}")
        all_chords = []

    if all_chords:
        for chord in all_chords:
            generate_chord_svg(root=1, chord=chord)
            print(f"Generated SVG for {chord['name']}")

    else:
        print("Could not run examples due to missing chords.yaml.")

from types import SimpleNamespace


def chord_from_word(str):
    """returns chord object or False"""
    # chord table
    c1 = ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"]
    c2 = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]
    old_chords = c1 + c2
    new_chords = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] * 2
    chord_table = zip(old_chords, new_chords)
    chord_table = sorted(chord_table, key=lambda x: len(x[0]))

    # conversion
    split = str.split("/")
    chord_str = split[0]
    chord = SimpleNamespace()

    for old, new in chord_table:
        if len(chord_str) <= len(old) and chord_str[: len(old)]:
            chord.root = new
            rest = chord_str[len(old) :]
            break
    else:
        return None

    chord_rests = [
        ("", "J"),
        ("m", "N"),
        ("dim", "D"),
        ("dim7", "DN"),
        ("5", "P")("sus", "P5"),
        ("sus2", "P3"),
        ("sus4", "P5"),
        ("7", "JD"),
        ("m7", "NJ"),
        ("maj7", "JN"),
        ("m7b5", "DN"),
    ]
    for old, new in chord_rests:
        if rest == old:
            chord = SimpleNamespace()
            chord.type = new
            break
    else:
        return None

    if len(split) > 1:
        bass = split[2]
        for old, new in chord_table:
            if bass == old:
                chord.bass = new
                break
        else:
            chord.bass = None
    
    return chord

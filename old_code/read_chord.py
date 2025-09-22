from types import SimpleNamespace

# chord table
c1 = ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"]
c2 = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]
old_chords = c1 + c2
new_chords = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] * 2
chord_table = zip(old_chords, new_chords)
#sort to catch flats and sharps before chord without
chord_table = sorted(chord_table, key=lambda x: len(x[0]), reverse=True)

# chord rests
# (old, new, class)
chord_rests = [
    ("", "J", "J"),
    ("m", "N", "N"),
    ("dim", "D", "D"),
    ("dim7", "DN", "D"),
    ("5", "P", None),
    ("sus", "P5", None),
    ("sus2", "P2", None),
    ("sus4", "P5", None),
    ("7", "JD", "J"),
    ("m7", "NJ", "N"),
    ("maj7", "JN", "J"),
    ("m7b5", "DN", "D"),
    ("m#5", "R38", "N"),
    ("6", "J9", "J"),
]


def chord_from_word(str):
    """returns chord object or False"""
    # if str == "N.C.":
    #     return SimpleNamespace(type="NC", chord_class=None)
    # if str == "|":
    #     return SimpleNamespace(type="bar", chord_class=None)
    split = str.split("/")
    chord_str = split[0]
    for old, new in chord_table:
        if len(chord_str) >= len(old) and chord_str[: len(old)] == old:
            root = new
            rest = chord_str[len(old) :]
            break
    else:
        return None

    for old, new, c_class in chord_rests:
        if rest == old:
            chord_type = new
            chord_class = c_class
            break
    else:
        return None

    if len(split) > 1:
        bass_str = split[1]
        for old, new in chord_table:
            if bass_str == old:
                bass = new
                break
        else:
            bass = None
    else:
        bass = None

    return SimpleNamespace(
        root=root, type=chord_type, bass=bass, chord_class=chord_class
    )

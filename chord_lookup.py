old_notes = ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"] + [
    "A",
    "A#",
    "B",
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
]

new_notes = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] * 2
note_dict = dict(zip(old_notes, new_notes))


chord_dict = {
    "": "j",
    "m": "n",
    "dim": "d",
    "dim7": "dn",
    "sus": "s&#8593",
    "sus2": "s&#8595",
    "sus4": "s&#8593",
    "7": "jd",
    "m7": "nj",
    "maj7": "jn",
    "m7b5": "dn",
}

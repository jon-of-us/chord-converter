def chords_lookup():
    """
    $ as placeholder for each character that the new chord is too long
    % as placeholder for each character that the new chord is too short
    """

    lookup = {}
    for old, new in chord_table:
        # major
        lookup[old] = new + "j"
        # minor
        lookup[old + "m"] = new + "n"
        # dimished
        lookup[old + "dim"] = new + "d"
        lookup[old + "dim7"] = new + "dn"
        # sus
        lookup[old + "sus"] = new + "s&#8593"
        lookup[old + "sus2"] = new + "s&#8595"
        lookup[old + "sus4"] = new + "s&#8593"
        # 7
        lookup[old + "7"] = new + "jd"
        # minor 7
        lookup[old + "m7"] = new + "nj"
        # major 7
        lookup[old + "maj7"] = new + "jn"
        # over
        # other
        lookup[old + "m7b5"] = new + "dn"
        lookup["/" + old] = "/" + new

    # adjust length
    for old, new in lookup.items():
        if len(old) > len(new):
            lookup[old] = new + "%" * (len(old) - len(new))
        if len(old) < len(new):
            lookup[old] = new + "$" * (len(new) - len(old))

    # add bold font
    for old, new in lookup.items():
        lookup[old] = "<b>" + new + "</b>"

    return lookup


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

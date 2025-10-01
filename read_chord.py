import yaml

class Chord():
    def __init__(self, root, intervals, bass):
        self.root = root
        self.intervals = intervals
        self.bass = bass

# %% CHORD TABLE
c1 = ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"]
c2 = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]
old_chords = c1 + c2
new_chords = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] * 2
chord_table = zip(old_chords, new_chords)
#sort to catch flats and sharps before chord without
chord_table = sorted(chord_table, key=lambda x: len(x[0]), reverse=True)

with open("chords.yaml", "r") as f:
    chord_types = yaml.safe_load(f).get("chords", [])

# %% PARSE FUNCTION

def chord_from_word(str):
    """returns chord object or None"""
    split = str.split("/")
    chord_str = split[0]
    for old, new in chord_table:
        if len(chord_str) >= len(old) and chord_str[: len(old)] == old:
            root = new
            rest = chord_str[len(old) :]
            break
    else:
        return None

    for chord_type in chord_types:
        for alias in chord_type.get("aliases", []):
            if rest == alias:
                # check for base
                if len(split) > 1:
                    bass_str = split[1]
                    for old, new in chord_table:
                        if bass_str == old:
                            bass = new
                            break
                    else:
                        bass = 0
                return Chord(
                    root, chord_type.get("intervals", []), bass
                )
    return None 
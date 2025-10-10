# %%
import numpy as np

chord_freq = {
    "G": 73,
    "F": 73,
    "C": 68,
    "Am": 56,
    "Dm": 26,
    "Em": 17,
    "E": 10,
    "D": 6,
    "A#": 2,
    "A": 2,
}

chord_notes = {
    "C": ["C", "E", "G"],
    "Dm": ["D", "F", "A"],
    "Em": ["E", "G", "B"],
    "F": ["F", "A", "C"],
    "G": ["G", "B", "D"],
    "Am": ["A", "C", "E"],
    "E": ["E", "G#", "B"],
    "D": ["D", "F#", "A"],
    "A#": ["A#", "D", "F"],
    "A": ["A", "C#", "E"],
}

note_popularity = {}
for chord, freq in chord_freq.items():
    base = chord.rstrip("m")  # base note (ignore minor marker)
    for note in chord_notes[chord]:
        # weight = 2 if note == base else 1
        note_popularity[note] = note_popularity.get(note, 0) + freq 

circle_of_fifths = ["G#", "D#", "A#", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"]
popularity_array = np.array([note_popularity.get(note, 0.0) for note in circle_of_fifths], dtype=float)
popularity_array
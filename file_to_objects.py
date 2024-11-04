from read_chord import chord_from_word
from types import SimpleNamespace


def line_type(line):
    if len(line.strip()) == 0:
        return "empty"
    if line.strip()[0] == "[":
        return "subheading"
    split = line.split(" ")
    # remove all "" from split
    split = [word for word in split if word != ""]
    words = [word.split("/")[0] for word in split]
    n_words = len(words)
    is_chord = [chord_from_word(word) != None for word in words]
    n_chords = sum(is_chord)
    if n_chords / n_words > 0.5:
        return "chords"
    return "lyrics"


def line_objects(lines):
    """convert to content object with str() function"""
    content = []
    chords = []
    for i, line in enumerate(lines):
        # determine type
        line = line.strip("\n")
        if i == 0:
            l_type = "heading"
        else:
            l_type = line_type(line)

        # create object
        if l_type in ["subheading", "heading"]:
            obj = SimpleNamespace(type=l_type, text=line)
        elif l_type == "empty":
            continue
        elif l_type == "chords":
            split = line.split(" ")
            lengs = [len(word) for word in split]
            place_in_line = [sum(lengs[:i]) + i for i in range(len(lengs))]
            chord_or_words = []
            for j, word in enumerate(split):
                if word == "":
                    continue
                chord = chord_from_word(word)
                if chord != None:
                    chords.append(chord)
                    chord_or_words.append(
                        SimpleNamespace(
                            type="chord", idx=len(chords) - 1, place=place_in_line[j]
                        )
                    )
                else:
                    chord_or_words.append(
                        SimpleNamespace(type="word", text=word, place=place_in_line[j])
                    )
            if len(lines) > i + 1 and line_type(lines[i + 1]) == "lyrics":
                text = lines[i + 1]
                lines.pop(i + 1)
            else:
                text = None
            obj = SimpleNamespace(
                type="chords", chord_or_words=chord_or_words, text=text
            )
        elif l_type == "lyrics":
            obj = SimpleNamespace(type="lyrics", text=line)
        else:
            print("error, line type not found")
        content.append(obj)
    return content, chords

from readChord import chord_from_word


def line_type(line):
    if len(line.strip()) == 0:
        return "empty"
    if line.strip()[0] == "[":
        return "subheading"
    split = line.split(" ")
    words = [word.split("/")[0] for word in split]
    n_words = len(words)
    n_chords = sum(1 for word in words if chord_from_word != None)
    if n_chords / n_words > 0.5:
        return "chords"
    return "lyrics"


class Line:
    def __init__(self, type) -> None:
        self.type = type


def contentObject(lines):
    """convert to content object with str() function"""
    content = []
    for i, line in enumerate(lines):
        l_type = line_type(line)
        if l_type in ["subheading, heading"]:
            obj = Line(l_type)
            obj.text = line
            content.append(obj)
        elif l_type == "empty":
            continue
        elif l_type == "chords":
            split = line.split(" ")
            lengs = [len(word) for word in split]
            place_in_line = [sum(lengs[:i]) for i in range(len(lengs))]
            chords = [chord_from_word(word) for word in split]
            obj.words = []
            n_not_chords = sum(1 for chord in chords if chord == None)
            for i, chord in enumerate(chords):
                if chord != None:
                    chord.start = place_in_line
                    obj.words.append(chord)
                else:
                    obj.words.append(split[i])

            if len(lines) < i + 1 and line_type(lines[i + 1]) == "lyrics" and n_not_chords == 0:
                text = lines[i + 1]
                lines.pop(i + 1)
            else:
                text = ""
            obj = Line(l_type)
            obj.text = text
        elif l_type == "lyrics":
            obj = Line(l_type)
            obj.text = line
        content.append()

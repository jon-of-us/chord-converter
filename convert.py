from chord_lookup import note_dict, chord_dict


class Chord:
    def __init__(self, note, chord_type, length, bass_note=None):
        self.length = length
        """length of the chord in characters"""
        self.note = note
        self.chord_type = chord_type
        self.bass_note = bass_note

    @classmethod
    def from_string(self, string):
        """convert string to chord object, return string if conversion failed"""
        split = string.split("/")
        if len(split) > 2:
            return string
        # handle bass note
        if len(split) == 2:
            if not split[1] in note_dict:
                return string
            bass_note = note_dict[split[1]]
        else:
            bass_note = None
        chord_str = split[0]
        if len(chord_str) >= 2 and chord_str[:2] in note_dict:
            note = note_dict[chord_str[:2]]
            chord_type_str = chord_str[1:]
        elif len(chord_str) == 1 and chord_str[0] in note_dict:
            note = note_dict[chord_str[0]]
            chord_type_str = chord_str[1:]
        else:
            return string
        chord_type = (
            chord_dict[chord_type_str]
            if chord_type_str in chord_dict
            else chord_type_str
        )

        return Chord(note, chord_type, len(string))

    def __str__(self):
        output = str(self.note)
        if self.bass_note != None:
            output += "/" + self.bass_note
        output += " "

        # adjust length add % to indicate that whitespaces are missing and $ to indicate length is too long
        if self.length > len(output):
            output += "%" * (self.length - len(output))
        if self.length < len(output):
            output += "$" * (len(output) - self.length)

        # add bold font
        output = "<b>" + output + "</b>"


def convert_line(line, index):
    """takes line without whitespace"""

    def adjust_whitespaces(line):
        """removes whitespaces, if new chord is too long
        (indicated by a $ for each character that the new chord is too long
        and a % for each character that the new chord is too short)
        """
        new_line = ""
        n_whitespaces_to_remove = 0
        last_char_was_whitespace = False
        for char in line:
            if char == "$":
                n_whitespaces_to_remove += 1
            elif char == "%":
                n_whitespaces_to_remove -= 1
            elif char == " ":
                if n_whitespaces_to_remove < 0:
                    n_whitespaces_to_remove += 1
                    new_line += "  "
                elif last_char_was_whitespace and n_whitespaces_to_remove > 0:
                    n_whitespaces_to_remove -= 1
                else:
                    new_line += " "
                last_char_was_whitespace = True
            else:
                new_line += char
                last_char_was_whitespace = False
        return new_line

    # test if line is heading
    if index == 0:
        return f"<h1> {line} \n<h1>\n"
    # test if line is subheading
    if len(line) > 0 and line[0] == "[":
        return f"\n\n<b><big> {line} \n</big></b>\n"
    # test if line is empty
    if line == "" or line.isspace():
        return ""
    # line is considered as chord line, if there are more chords than words
    split = line.split(" ")
    chord_list = map(Chord.from_string, split)
    n_words = len([x for x in chord_list if type(x) == line and x != ""])
    n_chords = len([x for x in chord_list if type(x) == Chord])
    if n_chords < n_words:
        return line

    new_line = " ".join([str(x) for x in chord_list])
    adjust_whitespaces(new_line)

    return new_line


def converted_file(filepath):
    f = open(filepath, "r")
    lines = f.readlines()
    f.close()

    output = ""

    output += "\n<pre>\n"
    output += "".join([convert_line(line, i) for i, line in enumerate(lines)])
    output += "\n</pre>\n"

    return output

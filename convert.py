from chord_lookup import new_chords


class Chord:
    def __init__(self, note, chord_type, length, bass_note=None):
        self.length = length
        """length of the chord in characters"""
        self.note = note
        self.chord_type = chord_type
        self.bass_note = bass_note

    @classmethod
    def from_string(self, string):
        """convert string to chord object"""

class Line:
    
    def __init__(self, str, index):
        def line_is_chordline(str):
            """check if line contains chords"""
            


        self.content = str
        if index == 0:
            self.type = "heading"
        elif len(str) > 0 and str[0] == "[":
            self.type = "subheading"
        elif str == "" or str.isspace():
            self.type = "empty"
        elif 


def line_to_array(line):
    """convert line into array of chords and strings"""


def convert_line(line, line_number):
    """convert a line of chords to the new format"""

    def new_word(word):
        # split while keeping dilimeter
        word = word.split("/")
        for i in range(1, len(word)):
            word[i] = "/" + word[i]

        new_word = [new_chords[part] if part in new_chords else part for part in word]
        new_word = "".join(new_word)
        return new_word

    def adjust_whitespaces(line):
        """removes whitespaces, if new chord is too long
        (indicated by a $ for each character that the new chord is too long
        and a % for each character that the new chord is too short)
        """
        output = ""
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
                    output += "  "
                elif last_char_was_whitespace and n_whitespaces_to_remove > 0:
                    n_whitespaces_to_remove -= 1
                else:
                    output += " "
                last_char_was_whitespace = True
            else:
                output += char
                last_char_was_whitespace = False
        return output

    # remove newline character
    line = line[:-1]

    # skip line if only contains whitespace
    if line.isspace() or line == "":
        return ""

    # handle heading
    if line_number == 0:
        return "<h2>" + line + "\n</h2>\n"

    # handle subheading
    if len(line) > 0 and line[0] == "[":
        return "\n\n<b><big>" + line + "\n</big></b>\n"

    line = line.split(" ")
    new_line = [new_word(word) for word in line]
    new_line = " ".join(new_line)
    new_line = adjust_whitespaces(new_line)
    new_line += "\n"
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

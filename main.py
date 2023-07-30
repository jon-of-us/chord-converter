#

from os import walk
from chord_lookup import new_chords


def files_in_folder(path):
    """yield relative path to all files in a directory"""
    for dirpath, dirnames, filenames in walk(path):
        for filename in filenames:
            yield dirpath + "/" + filename


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

    # handle heading
    if line_number == 0:
        return "<h2>" + line + "</h2>"

    # handle subheading
    if len(line) > 0 and line[0] == "[":
        return "<b><big>" + line + "</big></b>"

    line = line.split(" ")
    new_line = [new_word(word) for word in line]
    new_line = " ".join(new_line)
    newline = adjust_whitespaces(new_line)
    return newline


def converted_file(filepath):
    f = open(filepath, "r")
    lines = f.readlines()
    f.close()

    output = ""

    output += "\n<pre>\n"
    output += "\n".join([convert_line(line, i) for i, line in enumerate(lines)])
    output += "\n</pre>\n"

    return output


def convert_all():
    for filepath in files_in_folder("./input"):
        converted = converted_file(filepath)
        out_path = "./output/" + filepath.split("/")[-1]
        # save as html
        out_path = out_path[:-3] + "html"
        f = open(out_path, "w")
        f.write(converted)
        f.close()


if __name__ == "__main__":
    convert_all()

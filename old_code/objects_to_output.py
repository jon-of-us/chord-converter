def html_body(title, content):
    return f"""
<!DOCTYPE html>
<html>
    <head>
        <title>{title}</title>
    </head>
    <body>
{content}
    </body>
</html>
"""


# fmt: off
is_in_scale = [True, True, True, False, False, False, False, True, True, True, True, True]
new_chord_basic = ["●", "●+", "●++", "▲-↑", "▲↑", "●↓", "●+↓", "▲--", "▲-", "▲", "▲+", "●-"]
new_chord_major = ["●", "●+", "●++", "▲-↑", "▲↑", "●↓", "●+↓", "▲--", "▲-", "▲", "▲+", "▲++"]
new_chord_minor = ["●", "●+", "●++", "▲-↑", "▲↑", "●↓", "●+↓", "▲--", "▲-", "▲", "●--", "●-"]

nums = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]
# fmt: on


def converted_chord(chord_list, index):
    chord = chord_list[index]
    res = ""
    if chord.type == "NC":
        return "N.C."
    if chord.type == "bar":
        return "|"
    if chord.chord_class == "J":
        res += new_chord_major[chord.root]
    elif chord.chord_class == "N":
        res += new_chord_minor[chord.root]
    else:
        res += new_chord_basic[chord.root]
    if not ((chord.type == "J" and "▲" in res) or (chord.type == "N" and "●" in res)):
        res += chord.type
    if chord.bass != None:
        res += "/" + nums[(chord.bass - chord.root + 12) * 7 % 12]
    return res


def output(content, chords, title):
    """writes chords above lines"""
    output = ""
    for obj in content:
        if obj.type == "heading":
            output += "<h2>" + obj.text + "</h2>\n"
        elif obj.type == "subheading":
            output += "\n\n<b><big>" + obj.text + "</big></b>\n"
        elif obj.type == "lyrics":
            output += "<pre>" + obj.text + "</pre>\n"
        elif obj.type == "chords":
            chord_line = ""
            for chord_or_word in obj.chord_or_words:

                string = (
                    chord_or_word.text
                    if chord_or_word.type == "word"
                    else converted_chord(chords, chord_or_word.idx)
                )
                chord_line += (
                    " " * max(0, chord_or_word.place - len(chord_line)) + string + " "
                )

            output += "<pre><b>" + chord_line + "</b></pre>\n"
            if obj.text != None:
                output += "<pre>" + obj.text + "</pre>\n"
        else:
            print("line object not found")
        output = output.replace("</pre>\n<pre>", "\n")
    return html_body(title, output)

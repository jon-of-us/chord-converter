
def output(line_objects):
    """ writes chords above lines"""
    output = ""
    for obj in line_objects:
        if obj.type == "heading":
            output += "<h1>" + obj.text + "</h1>\n"
        elif obj.type == "subheading":
            output += "<h3>" + obj.text + "</h3>\n"
        elif obj.type == "lyrics":
            output += "<p>" + obj.text + "</p>\n"
        else:
            print("line object not found") 
    
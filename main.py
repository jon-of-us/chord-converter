#

from os import walk
from objects_to_output import output
from file_to_objects import line_objects


def files_in_folder(path):
    """yield relative path to all files in a directory"""
    for dirpath, dirnames, filenames in walk(path):
        for filename in filenames:
            yield dirpath + "/" + filename


if __name__ == "__main__":
    for filepath in files_in_folder("./input"):
        name = filepath.split("/")[-1].split(".")[0]
        # out_path = "./output/" + name + ".html"
        out_path = "/mnt/c/Users/Jonas/Desktop/akkorde/" + name + ".html"

        with open(filepath, "r", encoding="utf-8") as file:
            lines = file.readlines()

        content, chords = line_objects(lines)
        converted = output(content, chords, name)

        with open(out_path, "w", encoding="utf-8") as out_file:
            out_file.write(converted)

        print("converted " + filepath)

#

from os import walk
from convert import converted_file


def files_in_folder(path):
    """yield relative path to all files in a directory"""
    for dirpath, dirnames, filenames in walk(path):
        for filename in filenames:
            yield dirpath + "/" + filename


def convert_all():
    for filepath in files_in_folder("./input"):
        converted = converted_file(filepath)
        out_path = "./output/" + filepath.split("/")[-1]
        # save as html
        out_path = out_path[:-3] + "html"
        f = open(out_path, "w")
        f.write(converted)
        f.close()
        print("converted " + filepath)


if __name__ == "__main__":
    convert_all()

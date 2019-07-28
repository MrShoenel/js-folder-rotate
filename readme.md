# FolderRotate
FolderRotate (or: `folder-rotate`) is a universal module for Node.js for rotating folders (restricting them to a certain size). The restrictions can be set per folder using certain rules.

This tool can be used as a library in your own project or as a standalone `CLI`-application. `JSDoc`-typedefs have been created to model the full output.

## Install via npm <span style="vertical-align:middle">[![Current Version](https://img.shields.io/npm/v/sh.folder-rotate.svg)](https://www.npmjs.com/package/sh.folder-rotate)</span>
`npm install sh.folder-rotate`

# Command Line Interface (CLI)
Here is how to run FF-FingerPrinter from CLI:

<pre>node ./cli/cli.js -h
Usage: cli [options]

FolderRotate (or: folder-rotate) is a universal module for Node.js for rotating folders (restricting them to a certain size). The restrictions can be set per folder using certain rules.

Options:
  -v, --version                      output the version number
  -p, --path <path>                  The Path to the directory to delete files in. Note that
                                     FolderRotate only considers files, never folders and thus
                                     also never works recursively.
  -r, --regex [regex]                Optional. Defaults to '.*' with flag 'i' (matches all files,
                                     case-insensitive). A regular expression to use for selecting
                                     files that should be deleted. Note that directories will
                                     never be selected for deletion. You should pass in a literal
                                     regular expression, that ends with flags, e.g. '/^my_files.+?
                                     \.(?:js|css)$/i'.
  -b, --orderBy <orderBy>            One of "size", "name", "date_atime", "date_mtime", "date_ctime",
                                     "date_birthtime". Define what to order the selected files by.
  -d, --orderDir <orderDir>          One of "asc", "desc". Define the direction of the order for the
                                     selected files. Deletion of files ALWAYS HAPPENS AT THE END of
                                     that ordered list (delete excess). E.g. if the oldest files
                                     should be deleted, you probably want orderBy="date_birthtime"
                                     and orderDir="desc" (because the newest files have the largest
                                     timestamps and would be at the beginning of the descendingly
                                     ordered list).
  -m, --maxSize <maxSize>            Define the maximum size for the list of selected files. maxSize
                                     depends on the selected unit (e.g. "mb" or "qty"). The ordered
                                     list of selected files will be truncated at the end until maxSize
                                     is less than or equal to the value defined here. Truncation means
                                     deletion.
  -u, --rotationUnit <rotationUnit>  One of "b", "kb", "mb", "gb", "tb", "qty". Defines the unit for
                                     "maxSize". "b" through "tb" are sizes (byte, kilobyte, .., terabyte)
                                     and are powers of 1e3, not 2^10 (i.e. one kb is 1,000 bytes and one
                                     mb is 1,000 kb), because SI-2 units do not make sense in this context
                                     (no, they don't).
  -c, --config [config]              Optional. Pass in this flag to print the configuration as it was
                                     understood from FolderRotate.
  -w, --wait [wait]                  Optional. Pass in this flag to wait for the user to commence the
                                     rotation.
  -s, --simulate [simulate]          Optional. Pass in this flag to simulate the folder rotation. If
                                     present, no files will be deleted.
  -h, --help                         output usage information
</pre>
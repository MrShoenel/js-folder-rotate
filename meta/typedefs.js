/**
 * @typedef RotationOrderBy
 * @type {'size'|'name'|'date_atime'|'date_mtime'|'date_ctime'|'date_birthtime'}
 */

/**
 * @typedef RotationUnit
 * @type {'b'|'kb'|'mb'|'gb'|'tb'|'qty'}
 */


/**
 * @typedef RotateConfig
 * @type {Object}
 * @property {string} path The Path to the directory to delete files in. Note that FolderRotate only considers files, never folders and thus also never works recursively.
 * @property {{ regex: string, flags: Array.<string> }} [filesRegex] Optional. Defaults to { regex: '.*', flags: ['i'] } (matches all files, case-insensitive). A regular expression to use for selecting files that should be deleted. Note that directories will never be selected for deletion.
 * @property {RotationOrderBy} orderBy Define what to order the selected files by.
 * @property {'asc'|'desc'} orderDir Define the direction of the order for the selected files. Deletion of files ALWAYS HAPPENS AT THE END of that ordered list (delete excess). E.g. if the oldest files should be deleted, you probably want orderBy='date_birthtime' and orderDir='desc' (because the newest files have the largest timestamps and would be at the beginning of the descendingly ordered list).
 * @property {number} maxSize Define the maximum size for the list of selected files. maxSize depends on the selected unit (e.g. 'mb' or 'qty'). The ordered list of selected files will be truncated at the end until maxSize is less than or equal to the value defined here. Truncation means deletion.
 * @property {RotationUnit} unit Defines the unit for 'maxSize'. 'b' through 'tb' are sizes (byte, kilobyte, .., terabyte) and are powers of 1e3, not 2^10 (i.e. one kb is 1,000 bytes and one mb is 1,000 kb), because SI-2 units do not make sense in this context (no, they don't).
 */


/**
 * @typedef FileNameWithStat
 * @type {Object}
 * @property {string} name
 * @property {string} absPath
 * @property {Stats} stat
 */

require('../meta/typedefs');


const path = require('path')
, fs = require('fs')
, { Stats } = fs
, { unlinkFile } = require('sh.misc-tools');


/**
 * @typedef FileNameWithStat
 * @type {Object}
 * @property {string} name
 * @property {string} absPath
 * @property {Stats} stat
 */


/**
 * @author Sebastian Hönel <development@hoenel.net>
 */
class FolderRotate {
  /**
   * @param {RotateConfig} config
   */
  constructor(config) {
    config.filesRegex = config.filesRegex ? config.filesRegex : {
      regex: '.*',
      flags: ['i']
    };

    this.config = config;
  };

  /**
   * @param {string} absFilePath
   * @returns {Promise.<FileNameWithStat>}
   */
  static statFileAsync(absFilePath) {
    return new Promise((resolve, reject) => {
      fs.stat(absFilePath, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            absPath: absFilePath,
            name: path.basename(absFilePath),
            stat: stats
          });
        }
      });
    });
  };

  /**
   * @param {string} dir Absolute path to a directory.
   * @param {(file: string) => boolean} predicate A filter that is used for
   * deciding whether or not a file/directory is to be included.
   * @returns {Promise.<Array.<FileNameWithStat>>}
   */
  static getFilesAsync(dir, predicate) {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, async(err, files) => {
        if (err) {
          reject(err);
        } else {
          try {
            const stattedFiles = await Promise.all(
              files.filter(predicate).map(f =>
                FolderRotate.statFileAsync(path.resolve(path.join(dir, f)))));
            
            resolve(stattedFiles);
          } catch (e) {
            reject(e);
          }
        }
      });
    });
  };

  /**
   * @param {RotationUnit} unit
   * @throws {Error} If the unit is not a byte-size unit (pun intended).
   * @returns {number} The amount of bytes for the unit.
   */
  static getByteSizeForRotationUnit(unit) {
    switch (unit) {
      case "b":
        return 1;
      case "kb":
        return 1e3;
      case "mb":
        return 1e6;
      case "gb":
        return 1e9;
      case "tb":
        return 1e12;
      case "qty":
        throw new Error(`The unit '${unit}' is not a byte-size unit.`);
    }

    throw new Error(`The unit '${unit}' is not known.`);
  };

  /**
   * @returns {Promise.<Array.<FileNameWithStat>>} An array of files (and
   * their stats) that should be deleted, according to the configuration.
   */
  async getFilesToDelete() {
    const c = this.config
    , asc = c.orderDir === 'asc' ? 1 : -1
    , regex = new RegExp(c.filesRegex.regex, c.filesRegex.flags.join(''));

    const filesSorted = (await FolderRotate.getFilesAsync(c.path, f => regex.test(f)))
      .filter(fnws => fnws.stat.isFile())
      .sort((fA, fB) => {
        if (c.orderBy === 'name') {
          return fA.name.localeCompare(fB.name) * asc;
        } else if (c.orderBy === "size") {
          return (fA.stat.size < fB.stat.size ? -1 : 1) * asc;
        } else if (c.orderBy === 'date_atime') {
          return (fA.stat.atimeMs < fB.stat.atimeMs ? -1 : 1) * asc;
        } else if (c.orderBy === 'date_ctime') {
          return (fA.stat.ctimeMs < fB.stat.ctimeMs ? -1 : 1) * asc;
        } else if (c.orderBy === 'date_mtime') {
          return (fA.stat.mtimeMs < fB.stat.mtimeMs ? -1 : 1) * asc;
        } else if (c.orderBy === 'date_birthtime') {
          return (fA.stat.birthtimeMs < fB.stat.birthtimeMs ? -1 : 1) * asc;
        }

        throw new Error(`The value for orderBy '${c.orderBy}' is not recognized.`);
      });

    if (c.unit === 'qty') {
      if (filesSorted.length > c.maxSize) {
        return filesSorted.slice(c.maxSize);
      }
      return [];
    } else {
      const maxSize = c.maxSize * FolderRotate.getByteSizeForRotationUnit(c.unit);
      let idx = 0, size = 0;
      for (; idx < filesSorted.length; idx++) {
        size += filesSorted[idx].stat.size;
        if (size > maxSize) {
          break;
        }
      }

      return filesSorted.slice(idx);
    }
  };

  /**
   * @param {boolean} simulate Optional. Defaults to false. Whether or not
   * deleting files should be simulated.
   * @returns {Promise.<Array.<FileNameWithStat>>} An array with absolute paths
   * to files that have been deleted (or would have been, if 'simulate' was set
   * to true).
   */
  async rotate(simulate = false) {
    const files = await this.getFilesToDelete();

    for (const file of files) {
      !simulate && await unlinkFile(file.absPath);
    }

    return files;
  };
};


module.exports = Object.freeze({
  FolderRotate
});

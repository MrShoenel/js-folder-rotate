require('../meta/typedefs');


const { assert } = require('chai')
, path = require('path')
, fs = require('fs')
, fsX = require('fs-extra')
, testFolder = path.resolve(path.join(__dirname, 'testFiles'))
, { FolderRotate } = require('../lib/FolderRotate')
, { assertThrowsAsync, timeout } = require('sh.orchestration-tools');


/**
 * @param {string} name 
 * @param {number} size 
 * @returns {Promise.<string>} the abs path
 */
const createFile = (name, size) => new Promise((res, rej) => {
  try {
    const buf = Buffer.alloc(size, 'a')
    , n = path.resolve(path.join(testFolder, name))
    , w = fs.createWriteStream(n);

    w.write(buf, err => {
      if (err) {
        rej(err);
      } else {
        w.end(() => {
          res(n);
        });
      }
    });
  } catch (e) {
    rej();
  }
});

const touchFile = absPath => new Promise((res, rej) => {
  try {
    fs.appendFileSync(absPath, 'a');
    res();
  } catch (e) {
    rej(e);
  }
});


describe('FolderRotate', function() {

  this.beforeEach(() => {
    if (fs.existsSync(testFolder)) {
      try {
        fsX.removeSync(testFolder);
      } catch (e) { }
    }
    try {
      fs.mkdirSync(testFolder);
    } catch (e) { }
  });

  this.afterEach(() => {
    try {
      fsX.removeSync(testFolder);
    } catch (e) { }
  });

  it('should throw if given invalid arguments', done => {
    assert.doesNotThrow(() => {
      FolderRotate.getByteSizeForRotationUnit('b');
      FolderRotate.getByteSizeForRotationUnit('kb');
      FolderRotate.getByteSizeForRotationUnit('mb');
      FolderRotate.getByteSizeForRotationUnit('gb');
      FolderRotate.getByteSizeForRotationUnit('tb');
    });

    assert.throws(() => {
      FolderRotate.getByteSizeForRotationUnit('qty');
    }, /The unit 'qty' is not a byte-size unit./i);

    assert.throws(() => {
      FolderRotate.getByteSizeForRotationUnit('f');
    }, /The unit 'f' is not known/i);

    done();
  });

  it('should throw for unknown sorting methods', async() => {
    /** @type {RotateConfig} */
    const conf = {
      maxSize: 1,
      orderBy: 'date_birthtime',
      orderDir: 'desc',
      path: testFolder,
      unit: 'qty'
    };

    const fr = new FolderRotate(conf);
    await createFile('ase', 1);
    await createFile('asd', 1);

    conf.orderBy = 'foo'; // INVALID!

    await assertThrowsAsync(async() => {
      await fr.rotate(); // would delete
    });
  });

  it('should throw for invalid files, directories or predicates', async() => {
    await assertThrowsAsync(async() => {
      await FolderRotate.statFileAsync('invalid:///file.bla');
    });

    await assertThrowsAsync(async() => {
      await FolderRotate.getFilesAsync('/invalid-dir/', f => true);
    });

    await assertThrowsAsync(async() => {
      await FolderRotate.getFilesAsync(__dirname, file => {
        throw new Error('test123');
      });
    });
  });

  it('should be able to create files with certain size', async() => {
    const n = await createFile(`test_${+new Date}`, 500);
    assert.isTrue(fs.existsSync(n));
    const s = fs.statSync(n);
    assert.strictEqual(s.size, 500);
    fs.unlinkSync(n);
  });

  it('should delete the right files if sorted by name or size', async() => {
    /** @type {RotateConfig} */
    const conf = {
      maxSize: 1,
      orderBy: 'name',
      orderDir: 'asc',
      path: testFolder,
      unit: 'qty'
    };

    const fr = new FolderRotate(conf);

    await createFile('ase', 90);
    await createFile('asd', 100);

    let f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'ase');
    // reverse order:
    conf.orderDir = 'desc';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asd');
    conf.orderDir = 'asc';
    
    conf.orderBy = 'size';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asd');

    // Now raise the qty:
    conf.maxSize = 2;
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 0);

    conf.maxSize = 189;
    conf.unit = 'b';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asd');

    conf.maxSize = 190;
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 0);
  });

  it('it should support reversing the order of files well', async() => {
    /** @type {RotateConfig} */
    const conf = {
      maxSize: 2,
      orderBy: 'date_birthtime',
      orderDir: 'asc',
      path: testFolder,
      unit: 'qty'
    };

    const fr = new FolderRotate(conf);

    await createFile('asd', 10);
    await timeout(25);
    await createFile('ase', 20);
    await timeout(25);
    await createFile('asf', 30);

    let f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asf');

    conf.orderBy = 'date_mtime';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asf');

    conf.orderBy = 'date_atime';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asf');

    conf.orderBy = 'size';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asf');
  });

  it('should delete the right files if sorted by any of the times', async() => {
    /** @type {RotateConfig} */
    const conf = {
      filesRegex: {
        regex: '.*',
        flags: ['i']
      },
      maxSize: 1,
      orderBy: 'date_birthtime',
      orderDir: 'asc',
      path: testFolder,
      unit: 'qty'
    };
    const fr = new FolderRotate(conf);

    const ase = await createFile('ase', 1);
    await timeout(50);
    const asd = await createFile('asd', 1);

    let f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asd');
    // reverse order:
    conf.orderDir = 'desc';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'ase');
    conf.orderDir = 'asc';

    conf.orderBy = 'date_mtime';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asd');

    conf.orderBy = 'date_atime';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asd');

    conf.orderBy = 'date_ctime';
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asd');

    await timeout(25);
    await touchFile(ase);
    f = await fr.rotate(true);
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'ase');

    conf.orderBy = 'date_birthtime';
    f = await fr.rotate(); // Will delete files
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].name, 'asd');
  });
});
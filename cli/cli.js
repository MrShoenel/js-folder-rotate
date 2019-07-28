require('../meta/typedefs');

const program = require('commander')
, path = require('path')
, fs = require('fs')
, packagePath = path.resolve(path.dirname(__filename), '../package.json')
, package = JSON.parse(fs.readFileSync(packagePath))
, { inspect } = require('util')
, { FolderRotate } = require('../lib/FolderRotate');


program
	.version(`\n  This is FolderRotate@v${package.version} by ${package.author}\n`, '-v, --version')
	.description('FolderRotate (or: folder-rotate) is a universal module for Node.js for rotating folders (restricting them to a certain size). The restrictions can be set per folder using certain rules.')
	.option('-p, --path <path>', 'The Path to the directory to delete files in. Note that FolderRotate only considers files, never folders and thus also never works recursively.')
	.option('-r, --regex [regex]', 'Optional. Defaults to \'.*\' with flag \'i\' (matches all files, case-insensitive). A regular expression to use for selecting files that should be deleted. Note that directories will never be selected for deletion. You should pass in a literal regular expression, that ends with flags, e.g. \'/^my_files.+?\\.(?:js|css)$/i\'.')
	.option('-b, --orderBy <orderBy>', 'One of "size", "name", "date_atime", "date_mtime", "date_ctime", "date_birthtime". Define what to order the selected files by.')
	.option('-d, --orderDir <orderDir>', 'One of "asc", "desc". Define the direction of the order for the selected files. Deletion of files ALWAYS HAPPENS AT THE END of that ordered list (delete excess). E.g. if the oldest files should be deleted, you probably want orderBy="date_birthtime" and orderDir="desc" (because the newest files have the largest timestamps and would be at the beginning of the descendingly ordered list).')
	.option('-m, --maxSize <maxSize>', 'Define the maximum size for the list of selected files. maxSize depends on the selected unit (e.g. "mb" or "qty"). The ordered list of selected files will be truncated at the end until maxSize is less than or equal to the value defined here. Truncation means deletion.')
	.option('-u, --rotationUnit <rotationUnit>', 'One of "b", "kb", "mb", "gb", "tb", "qty". Defines the unit for "maxSize". "b" through "tb" are sizes (byte, kilobyte, .., terabyte) and are powers of 1e3, not 2^10 (i.e. one kb is 1,000 bytes and one mb is 1,000 kb), because SI-2 units do not make sense in this context (no, they don\'t).')
	.option('-c, --config [config]', 'Optional. Pass in this flag to print the configuration as it was understood from FolderRotate.')
	.option('-w, --wait [wait]', 'Optional. Pass in this flag to wait for the user to commence the rotation.')
	.option('-s, --simulate [simulate]', 'Optional. Pass in this flag to simulate the folder rotation. If present, no files will be deleted.')
	.parse(process.argv);

if (!program.path || !program.orderBy || !program.orderDir || !program.maxSize || !program.rotationUnit) {
  console.error('Not all required arguments are present!');
  process.exit(-1);
}

/** @type {RotateConfig} */
const config = {
	path: path.resolve(program.path),
	orderBy: program.orderBy,
	orderDir: program.orderDir,
	maxSize: parseFloat(program.maxSize),
	unit: program.rotationUnit,
	filesRegex: (() => {
		const r = program.regex || '/.*/i'
		, fi = r.indexOf('/')
		, li = r.lastIndexOf('/')
		, hasFlags = r.length > li + 1
		, flags = hasFlags ? r.substring(li + 1) : '';

		if (fi < 0) {
			throw new Error(`Invalid regular expression given: ${program.regex}`);
		}

		return {
			regex: r.substring(fi + 1, li),
			flags: flags.split('')
		};
	})()
};


if (!program.simulate) {
	console.info('Simulation is DISABLED. FolderRotate is going to ACTUALLY DELETE the files you are selecting!');
}
if (program.config) {
	console.info('The configuration, as understood from FolderRotate:');
	console.info(inspect(config));
}


(async() => {
	if (program.wait) {
		console.info('Press any key to continue.');
		const keypress = () => {
			process.stdin.setRawMode(true);
			return new Promise(resolve => process.stdin.once('data', () => {
				process.stdin.setRawMode(false);
				resolve();
			}));
		};

		await keypress();
	}

	/**
	 * @param {FileNameWithStat} file
	 * @returns {String}
	 */
	const formatDeletedFile = file => {
		let suffix = null;
		switch (config.orderBy) {
			case "size":
				suffix = `${file.stat.size} bytes`; break;
			case "date_atime":
				suffix = `${file.stat.atimeMs}`; break;
			case "date_ctime":
					suffix = `${file.stat.ctimeMs}`; break;
			case "date_mtime":
					suffix = `${file.stat.mtimeMs}`; break;
			case "date_birthtime":
					suffix = `${file.stat.birthtimeMs}`; break;
		}

		return `${file.absPath}${path.sep}${file.name}${suffix === null ? '' : ` (${suffix})`}`;
	};

	let errCode = 0;
	try {
		const fr = new FolderRotate(config)
		, files = await fr.rotate(!!program.simulate);

		console.info(files.map(formatDeletedFile).join('\n'));
	} catch (e) {
		console.error(`An error has occured: ${inspect(e)}`);
		errCode = 1;
	} finally {
		process.exit(errCode);
	}
})();


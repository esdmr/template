#!/usr/bin/env node
const fs = require('node:fs');
const process = require('node:process');
const utils = require('../utils.cjs');

const argv = process.argv.slice(2);

try {
	const json = JSON.parse(fs.readFileSync('package.json', 'utf8'));

	if (!utils.isObject(json)) {
		throw new TypeError('package.json is not an object or is null');
	}

	if (typeof json.name !== 'string') {
		throw new Error('package.json has no name, or the name is not a string');
	}

	const name = json.name;
	const exportsObject = getExportsObject(json.exports) ?? getTypesObject(json.types);

	if (exportsObject === undefined) {
		throw new Error('No exported types found');
	}

	/** @type {Map<string, string[]>} */
	const matches = new Map(argv.map((path) => [path, []]));

	for (let [key, value] of Object.entries(exportsObject)) {
		utils.log('New subpath:', key, '→', value);
		let isMapped = key.includes('/*');

		if (isMapped && !value.includes('/*')) {
			utils.warn('Pattern is mapped but its value is not');
			key = key.replace('/*', '/index');
			isMapped = false;
		}

		const keyBeginning = isMapped ? key.slice(0, key.indexOf('/*')) : key;
		const keyEnding = isMapped ? key.slice(key.indexOf('/*') + 2) : '';
		const beginning = isMapped ? value.slice(0, value.indexOf('/*')) : value;
		const ending = isMapped ? value.slice(value.indexOf('/*') + 2) : '';

		utils.log('  Key parts:', keyBeginning, '→', keyEnding);
		utils.log('  Value parts:', beginning, '→', ending);

		for (const [path, matched] of matches) {
			if (path.startsWith(beginning) && path.endsWith(ending)) {
				utils.log('  Path matches:', path);
				matched.push(name
					+ keyBeginning.slice(1) // This removes the dot
					+ path.slice(beginning.length, path.indexOf(ending))
					+ keyEnding);
			}
		}
	}

	for (const [path, matched] of matches) {
		if (matched.length === 0) {
			utils.log('Path did not match:', path);
		} else {
			matched.sort((a, b) => a.length - b.length);
			console.log(`${matched[0]}\t${path}`);
		}
	}

	// This overwrites the `package.json`. If you are running this script
	// locally, make sure to `git reset` it afterwards.
	json.name = 'placeholder_package_name';
	fs.writeFileSync('package.json', JSON.stringify(json), 'utf8');
} catch (error) {
	utils.error(error);
	process.exit(1);
}

/** @param {string} path */
function toRelative (path) {
	if (path.startsWith('/') || path.startsWith('../')) {
		utils.error('Path must start with neither / nor ../:', path);
		return;
	}

	return path.startsWith('./') ? path : `./${path}`;
}

/**
 * @param {unknown} exports
 */
function getExportsObject (exports) {
	if (!utils.isObject(exports)) {
		utils.error('"exports" field does not exist or is not an object');
		return;
	}

	utils.log('Package has conditional exports');

	if (exports.docs === null) {
		utils.warn('Package is exempted from documentation');
		return {};
	}

	if (typeof exports.types === 'string') {
		utils.log('Package does not use subpaths');

		const relative = toRelative(exports.types);

		if (relative === undefined) {
			return;
		}

		utils.log('  →', relative);

		return {
			'.': relative,
		};
	}

	const entries = Object.entries(exports);

	if (entries.length === 0) {
		utils.error('The "exports" field is empty');
		return;
	}

	if (entries.some(([key]) => key !== '.' && !key.startsWith('./'))) {
		utils.error('Package does not have any subpaths and the "types" field is missing');
		return;
	}

	/** @type {Record<string, string>} */
	const exportsObject = {};

	for (const [key, value] of entries) {
		if (!utils.isObject(value)) {
			utils.warn('Subpath is not an object:', key);
			continue;
		}

		if (value.docs === null) {
			utils.log('Subpath is exempted from documentation:', key);
			continue;
		}

		if (typeof value.types !== 'string') {
			utils.warn('Subpath does not have a "types" field:', key);
			continue;
		}

		utils.log('Subpath found:', key);

		const relative = toRelative(value.types);

		if (relative !== undefined) {
			utils.log('  →', relative);

			exportsObject[key] = relative;
		}
	}

	if (Object.keys(exportsObject).length === 0) {
		utils.warn('No valid subpath found for documentation');
	}

	return exportsObject;
}

/**
 * @param {unknown} types
 */
function getTypesObject (types) {
	if (typeof types !== 'string') {
		utils.error('"types" field does not exist or is not a string');
		return;
	}

	utils.log('Global "types" field found');

	const relative = toRelative(types);

	if (relative === undefined) {
		return;
	}

	utils.log('  →', relative);

	return {
		'.': relative,
	};
}

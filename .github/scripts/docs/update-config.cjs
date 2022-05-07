#!/usr/bin/env node
const fs = require('node:fs');
const process = require('node:process');
const utils = require('../utils.cjs');

try {
	const entrypoint = process.argv[2];

	if (!entrypoint) {
		throw new Error('No entrypoint was specified');
	}

	const json = JSON.parse(fs.readFileSync('api-extractor.json', 'utf8'));

	if (json) {
		json.mainEntryPointFilePath = '<projectFolder>/' + entrypoint;
	}

	fs.writeFileSync('api-extractor.json', JSON.stringify(json), 'utf8');
	utils.log('Updated api-extractor config');
} catch (error) {
	utils.error(error);
	process.exit(1);
}

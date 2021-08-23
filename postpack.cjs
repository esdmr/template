#!/usr/bin/env node
const fs = require('node:fs/promises');

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

async function main () {
	console.log('rm package.json');
	await fs.unlink('package.json');

	console.log('mv … package.json');
	await fs.rename('.package.dev.json', 'package.json');
}

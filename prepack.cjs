#!/usr/bin/env node
const child = require('node:child_process');
const fs = require('node:fs/promises');
const process = require('node:process');

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

/**
 * @param {Parameters<typeof child.spawn>} args
 * @returns {Promise<void>}
 */
async function spawn (...args) {
	return new Promise((resolve, reject) => {
		const process = child.spawn(...args);
		let done = false;

		process.once('error', (error) => {
			if (!done) {
				reject(error);
				done = true;
			}
		});

		process.once('exit', (code) => {
			if (!done) {
				if (code) {
					reject(new Error(`Process failed with error code: ${code}`));
				} else {
					resolve();
				}

				done = true;
			}
		});
	});
}

function getMetadata () {
	const metadata = require('./package.json');

	// Cleanup package.json
	delete metadata.scripts;
	delete metadata.devDependencies;
	delete metadata.engines.pnpm;
	delete metadata.imports['#test/*'];
	delete metadata.pnpm;

	return metadata;
}

async function main () {
	const metadata = getMetadata();

	console.log('pnpm install');
	await spawn('pnpm', ['install'], {});

	console.log('pnpm run lint');
	await spawn('pnpm', ['run', 'lint'], {});

	console.log('pnpm run build');
	await spawn('pnpm', ['run', 'build'], {});

	console.log('pnpm run test');
	await spawn('pnpm', ['run', 'test'], {});

	console.log('mv package.json …');
	await fs.rename('package.json', '.package.dev.json');

	console.log('new package.json');
	await fs.writeFile('package.json', JSON.stringify(metadata));
}

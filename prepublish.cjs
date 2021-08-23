const child = require('node:child_process');
const fs = require('node:fs/promises');

main().catch(console.error);

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
					resolve();
				} else {
					reject(new Error(`Process failed with error code: ${code}`));
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

	await spawn('pnpm', ['install'], {});
	await spawn('pnpm', ['run', 'lint'], {});
	await spawn('pnpm', ['run', 'build'], {});
	await spawn('pnpm', ['run', 'test'], {});
	await fs.rename('package.json', '.package.dev.json');
	await fs.writeFile('package.json', JSON.stringify(metadata));
}

#!/usr/bin/env node
import fs from 'node:fs/promises';
import { execaCommand } from 'execa';

async function getMetadata () {
	const metadata = JSON.parse(await fs.readFile('package.json', 'utf8'));

	// Cleanup package.json
	delete metadata.scripts;
	delete metadata.devDependencies;
	delete metadata.engines.pnpm;
	delete metadata.imports['#test/*'];
	delete metadata.packageManager;
	delete metadata.pnpm;

	for (const subpath of Object.keys(metadata.exports ?? {})) {
		delete metadata.exports[subpath].docs;
	}

	return metadata;
}

const metadata = await getMetadata();

/** @type {import('execa').Options} */
const options = {
	stdio: 'inherit',
};

console.log('pnpm install');
await execaCommand('pnpm install', options);

console.log('pnpm run build');
await execaCommand('pnpm run build', options);

console.log('pnpm run lint');
await execaCommand('pnpm run lint', options);

console.log('pnpm run test');
await execaCommand('pnpm run test', options);

console.log('mv package.json …');
await fs.rename('package.json', '.package.dev.json');

console.log('new package.json');
await fs.writeFile('package.json', JSON.stringify(metadata));

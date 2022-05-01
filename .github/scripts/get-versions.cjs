#!/usr/bin/env node
const fs = require('node:fs');
const process = require('node:process');
const utils = require('./utils.cjs');

try {
	const packageMeta = JSON.parse(fs.readFileSync('package.json', 'utf8'));

	if (typeof packageMeta !== 'object' || packageMeta === null) {
		throw new TypeError('Invalid package json');
	}

	const nodeVersion = packageMeta.engines?.node;

	if (typeof nodeVersion !== 'string') {
		throw new Error('Node.JS version not found');
	}

	const pinnedNodeVersion = nodeVersion.replace(/^(?:[<>]=|\^|~)/, '');

	if (!pinnedNodeVersion.match(/^\d+(?:\.\d+){0,2}$/)) {
		throw new Error(`Invalid Node.JS version: ${pinnedNodeVersion}`);
	}

	const pnpmVersion = packageMeta.packageManager;

	if (!pnpmVersion) {
		throw new Error('pnpm version not found');
	}

	const pinnedPNPMVersion = pnpmVersion.replace(/^pnpm@/, '');

	if (!pinnedPNPMVersion.match(/^\d+(?:\.\d+){2}$/)) {
		throw new Error(`Invalid pnpm version: ${pinnedPNPMVersion}`);
	}

	utils.log('Node.JS version:', pinnedNodeVersion);
	utils.log('   pnpm version:', pinnedPNPMVersion);
	utils.setOutput('node', pinnedNodeVersion);
	utils.setOutput('pnpm', pinnedPNPMVersion);
} catch (error) {
	utils.error(error);
	process.exit(1);
}

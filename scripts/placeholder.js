#!/usr/bin/env node
import process from 'node:process';
import readline from 'node:readline';
import fs from 'node:fs/promises';
import { execaCommand } from 'execa';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.once('SIGINT', () => {
	console.log();
	process.exit(130);
});

class StringMatcher {
	/**
	 * @param {string} text
	 * @param {Record<string, string>} matcher
	 */
	constructor (text, matcher) {
		this.text = text;
		this.matcher = matcher;
		this.keys = Object.keys(matcher).sort((a, b) => b.length - a.length);
		this.index = 0;
	}

	/**
	 * @param {ConstructorParameters<typeof StringMatcher>} args
	 */
	static replaceAll (...args) {
		return new StringMatcher(...args).replaceAll();
	}

	matchNext () {
		return this.keys
			.map((key) => ({
				key,
				index: this.text.indexOf(key, this.index),
			}))
			.filter(({ index }) => index !== -1)
			.sort((a, b) => a.index - b.index)[0];
	}

	replaceNext () {
		const match = this.matchNext();

		if (match === undefined) {
			return false;
		}

		const { key, index } = match;
		const value = this.matcher[key];
		const endIndex = index + key.length;

		if (value === undefined) {
			throw new Error(`Matcher could not find a value for ${key}`);
		}

		this.text = this.text.slice(0, index)
			+ value
			+ this.text.slice(endIndex);

		this.index = index + value.length;

		return true;
	}

	replaceAll () {
		// eslint-disable-next-line no-empty
		while (this.replaceNext()) {}

		return this.text;
	}
}

/**
 * @param {string} code
 * @param {string} message
 * @param {string} defaultValue
 * @returns {Promise<string>}
 */
async function readParameter (code, message, defaultValue = '') {
	const paddedCode = code.slice(0, 4).padEnd(4).toUpperCase();
	const prompt = defaultValue ? ` (${defaultValue})` : '';
	const fullMessage = `(${paddedCode}) ${message}${prompt}: `;
	const warnPadding = ' '.repeat(7);

	return new Promise((resolve) => {
		const ask = () => rl.question(fullMessage, (answer) => {
			answer ||= defaultValue;

			if (answer) {
				resolve(answer);
			} else {
				console.warn(`\n${warnPadding}This field is required.`);
				ask();
			}
		});

		ask();
	});
}

/**
 * @param {string} path
 * @param {(text: string) => string} cb
 */
async function patch (path, cb) {
	console.log(`Patching ${path}`);
	await fs.writeFile(path, cb(await fs.readFile(path, 'utf8')), 'utf8');
}

const { stdout: gitUserName } = await execaCommand('git config --get user.name');
const { stdout: gitUserEmail } = await execaCommand('git config --get user.email');
const { stdout: gitRemoteURL } = await execaCommand('git remote get-url origin');

const match = gitRemoteURL.match(/github\.com[/:](?<user>.*?)\/(?<repo>.*?)(\.git)?$/u);

const userDefault = match?.groups?.user ?? '';
const repoDefault = match?.groups?.repo ?? '';
const yearDefault = String(new Date().getUTCFullYear());
const tzDefault = new Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';

const USER = await readParameter('USER', 'Enter the GitHub username', userDefault);
const REPO = await readParameter('REPO', 'Enter name of the new repository', repoDefault);
const PACKAGE = await readParameter('PKG', 'Enter name of the package', REPO);

const projectDefault = PACKAGE
	.replace(/^\w/, (match) => match.toUpperCase())
	.replace(/-(\w)/g, ' $1');

const PROJECT = await readParameter('PROJ', 'Enter human readable name of the project', projectDefault);
const DESCRIPTION = await readParameter('DESC', 'Enter description of the repository');
const NAME = await readParameter('NAME', 'Enter your name', gitUserName);
const EMAIL = await readParameter('MAIL', 'Enter your public email address', gitUserEmail);
const YEAR = await readParameter('YEAR', 'Enter the current year', yearDefault);
const TIMEZONE = await readParameter('TZ', 'Enter your IANA Time Zone', tzDefault);

rl.close();

const commonMatcher = {
	'@esdmr/template': PACKAGE,
	'esdmr0@gmail.com': EMAIL,
	esdmr: USER,
	template: REPO,
	'Saeed M Rad': NAME,
	2021: YEAR,
};

/**
 * @param {string} text
 * @param {Record<string, string>} customMatcher
 * @returns {string}
 */
const replaceCommon = (text, customMatcher = {}) => StringMatcher.replaceAll(text, {
	...customMatcher,
	...commonMatcher,
});

await patch('.github/pages-template/_includes/head_custom.html', replaceCommon);
await patch('.github/pages-template/_config.yml', replaceCommon);
await patch('CODE_OF_CONDUCT.md', replaceCommon);
await patch('LICENSE', replaceCommon);

await patch('package.json', (text) => replaceCommon(text, {
	'Template project': DESCRIPTION,
	'  "private": true,\n': '',
}));

await fs.rename('README.template.md', 'README.md');

await patch('README.md', (text) => replaceCommon(text, {
	'¶ DESCRIPTION': DESCRIPTION,
	'§ PROJECT': PROJECT,
}));

await patch('renovate.json', (text) => text
	.replace(/,\s*"schedule":\s*".+?"/g, '')
	.replace('Asia/Tehran', TIMEZONE));

console.log('Clearing code');
await fs.writeFile('src/main.ts', '');
await fs.writeFile('test/main.ts', '');
await fs.unlink('examples/greet-a-friend.ts');

console.log('Deleting placeholder.js');
await fs.unlink('scripts/placeholder.js');

#!/usr/bin/env node
const child = require('node:child_process');
const process = require('node:process');
const readline = require('node:readline');
const fs = require('node:fs/promises');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const README_DESCRIPTION = `This is a template for TypeScript projects.
Further information at [the wiki](https://github.com/esdmr/template/wiki)`;

const README_LINK_TEMPLATE = '[`esdmr/template`][template]';
const README_LINK_WIKI = '[its wiki][template-wiki]';
const README_LINK_LIST = `[template]: https://github.com/esdmr/template
[template-wiki]: https://github.com/esdmr/template/wiki`;

rl.once('SIGINT', () => {
	console.log();
	process.exit(1);
});

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

/**
 * @template {unknown[]} T
 * @param {T} args
 * @returns {T}
*/
function tuple (...args) {
	return args;
}

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

	matchNext () {
		return this.keys
			.map((key) => tuple(key, this.text.indexOf(key, this.index)))
			.filter(([_, index]) => index !== -1)
			.sort((a, b) => a[1] - b[1])[0];
	}

	replaceNext () {
		const match = this.matchNext();

		if (match === undefined) {
			return false;
		}

		const [key, index] = match;
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
 * @param {string} message
 * @param {string} defaultValue
 * @returns {Promise<string>}
 */
async function readParameter (message, defaultValue = '') {
	const prompt = defaultValue ? ` (${defaultValue})` : '';

	return new Promise((resolve, reject) => {
		rl.question(`${message}${prompt}: `, (answer) => {
			answer ||= defaultValue;

			if (answer) {
				resolve(answer);
			} else {
				reject(new Error('Answer not provided.'));
			}
		});
	});
}

/**
 * @param {Parameters<typeof child.spawn>} args
 * @returns {Promise<string>}
 */
async function spawn (...args) {
	return new Promise((resolve, reject) => {
		const process = child.spawn(...args);
		let done = false;
		let stdout = '';

		process.stdout?.on('data', (data) => {
			if (!done) {
				stdout += data.toString();
			}
		});

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
					resolve(stdout.trim());
				}

				done = true;
			}
		});
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

async function main () {
	const gitUserName = await spawn('git', ['config', '--get', 'user.name'], {});
	const gitUserEmail = await spawn('git', ['config', '--get', 'user.email'], {});
	const gitRemoteURL = await spawn('git', ['remote', 'get-url', 'origin'], {});

	const match = gitRemoteURL.match(/github.com[/:](?<user>.*?)\/(?<repo>.*?)(\.git)?$/u);

	const userDefault = match?.groups?.user ?? '';
	const repoDefault = match?.groups?.repo ?? '';
	const yearDefault = String(new Date().getUTCFullYear());
	const tzDefault = new Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';

	const USER = await readParameter('<USER> Enter the GitHub username', userDefault);
	const REPO = await readParameter('<REPO> Enter name of the new repository', repoDefault);
	const PACKAGE = await readParameter('<PACKAGE> Enter name of the package', REPO);

	const projectDefault = PACKAGE
		.replace(/^\w/, (match) => match.toUpperCase())
		.replace(/-(\w)/g, ' $1');

	const PROJECT = await readParameter('<PROJECT> Enter human readable name of the project', projectDefault);
	const DESCRIPTION = await readParameter('<DESCRIPTION> Enter description of the repository');
	const NAME = await readParameter('<NAME> Enter your name', gitUserName);
	const EMAIL = await readParameter('<EMAIL> Enter your public email address', gitUserEmail);
	const YEAR = await readParameter('<YEAR> Enter the current year', yearDefault);
	const TIMEZONE = await readParameter('<TIMEZONE> Enter your IANA Time Zone', tzDefault);

	rl.close();

	/**
	 * @param {string} text
	 * @param {Record<string, string>} matcher
	 * @returns {string}
	 */
	function replaceCommon (text, matcher = {}) {
		matcher = {
			...matcher,
			'@esdmr/template': PACKAGE,
			'esdmr0@gmail.com': EMAIL,
			esdmr: USER,
			template: REPO,
			'Saeed M Rad': NAME,
			2021: YEAR,
		};

		Object.setPrototypeOf(matcher, null);

		return new StringMatcher(text, matcher).replaceAll();
	}

	await patch('.github/pages-template/_includes/head_custom.html', replaceCommon);
	await patch('.github/pages-template/_config.yml', replaceCommon);
	await patch('CODE_OF_CONDUCT.md', replaceCommon);
	await patch('LICENSE', replaceCommon);

	await patch('package.json', (text) => replaceCommon(text, {
		'Template project': DESCRIPTION,
		'  "private": true,\n': '',
	}));

	await patch('README.md', (text) => replaceCommon(text, {
		[README_DESCRIPTION]: DESCRIPTION,
		[README_LINK_TEMPLATE]: README_LINK_TEMPLATE,
		[README_LINK_WIKI]: README_LINK_WIKI,
		[README_LINK_LIST]: README_LINK_LIST,
		'Template Project': PROJECT,
	}));

	await patch('renovate.json', (text) => text
		.replace('Asia/Tehran', TIMEZONE));

	console.log('Deleting placeholder.cjs');
	await fs.unlink('placeholder.cjs');
}

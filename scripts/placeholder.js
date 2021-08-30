#!/usr/bin/env node
import child from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline';
import fs from 'node:fs/promises';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.once('SIGINT', () => {
	console.log();
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

	/**
	 * @param {ConstructorParameters<typeof StringMatcher>} args
	 */
	static replaceAll (...args) {
		return new StringMatcher(...args).replaceAll();
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

const TOKEN_TEXT = 0;
const TOKEN_BEGIN = 1;
const TOKEN_END = 2;

class MarkdownMatcher {
	/**
	 * @param {string} text
	 * @param {Record<string, string>} vars
	 * @param {Record<string, string>} matcher
	 */
	constructor (text, vars, matcher = {}) {
		this.text = text;
		this.vars = vars;
		this.matcher = matcher;
		this.reText = /[\s\S]((?!<!--)[\s\S])*/uy;
		this.reRegion = /<!-- *#region placeholder (?<name>\w+) *-->\n/uy;
		this.reEndRegion = /<!-- *#endregion placeholder *-->\n/uy;
		/** @type {string[]} */
		this.parts = [];
		this.currentPart = '';
		this.name = undefined;
	}

	/**
	 * @param {ConstructorParameters<typeof MarkdownMatcher>} args
	 */
	static replaceAll (...args) {
		return new this(...args).replaceAll();
	}

	getNextToken () {
		const { text, reRegion, reEndRegion, reText } = this;
		const matchName = reRegion.exec(text)?.groups?.name;

		if (matchName) {
			reEndRegion.lastIndex = reRegion.lastIndex;
			reText.lastIndex = reRegion.lastIndex;

			return {
				type: TOKEN_BEGIN,
				value: matchName,
			};
		}

		if (reEndRegion.test(text)) {
			reRegion.lastIndex = reEndRegion.lastIndex;
			reText.lastIndex = reRegion.lastIndex;

			return {
				type: TOKEN_END,
				value: '',
			};
		}

		const matchText = reText.exec(text)?.[0];

		if (matchText === undefined) {
			return undefined;
		}

		reRegion.lastIndex = reText.lastIndex;
		reEndRegion.lastIndex = reText.lastIndex;

		return {
			type: TOKEN_TEXT,
			value: matchText,
		};
	}

	commitPart () {
		switch (this.name) {
			case 'keep':
				this.parts.push(this.currentPart);
				break;

			case 'delete':
				break;

			case undefined:
				this.parts.push(StringMatcher.replaceAll(this.currentPart, this.matcher));
				break;

			default:
				this.parts.push((this.vars[this.name] ?? '') + '\n');
		}

		this.currentPart = '';
	}

	replaceAll () {
		let token;

		while ((token = this.getNextToken()) !== undefined) {
			switch (token.type) {
				case TOKEN_TEXT:
					this.currentPart += token.value;
					break;

				case TOKEN_BEGIN:
					this.commitPart();
					this.name = token.value;
					break;

				case TOKEN_END:
					this.commitPart();
					this.name = undefined;
					break;

				default:
					throw new Error('Unknown token type');
			}
		}

		this.commitPart();
		return this.parts.join('');
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

const gitUserName = await spawn('git', ['config', '--get', 'user.name'], {});
const gitUserEmail = await spawn('git', ['config', '--get', 'user.email'], {});
const gitRemoteURL = await spawn('git', ['remote', 'get-url', 'origin'], {});

const match = gitRemoteURL.match(/github.com[/:](?<user>.*?)\/(?<repo>.*?)(\.git)?$/u);

const userDefault = match?.groups?.user ?? '';
const repoDefault = match?.groups?.repo ?? '';
const yearDefault = String(new Date().getUTCFullYear());
const tzDefault = new Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';

const USER = await readParameter('(USER) Enter the GitHub username', userDefault);
const REPO = await readParameter('(REPO) Enter name of the new repository', repoDefault);
const PACKAGE = await readParameter('(PKG ) Enter name of the package', REPO);

const projectDefault = PACKAGE
	.replace(/^\w/, (match) => match.toUpperCase())
	.replace(/-(\w)/g, ' $1');

const PROJECT = await readParameter('(PROJ) Enter human readable name of the project', projectDefault);
const DESCRIPTION = await readParameter('(DESC) Enter description of the repository');
const NAME = await readParameter('(NAME) Enter your name', gitUserName);
const EMAIL = await readParameter('(MAIL) Enter your public email address', gitUserEmail);
const YEAR = await readParameter('(YEAR) Enter the current year', yearDefault);
const TIMEZONE = await readParameter('(TZ  ) Enter your IANA Time Zone', tzDefault);

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

await patch('README.md', (text) => MarkdownMatcher.replaceAll(text, {
	DESCRIPTION,
}, {
	'Template Project': PROJECT,
	...commonMatcher,
}));

await patch('renovate.json', (text) => text
	.replace('Asia/Tehran', TIMEZONE));

console.log('Clearing code');
await fs.writeFile('src/main.ts', '');
await fs.writeFile('test/main.ts', '');
await fs.unlink('examples/greet-a-friend.ts');

console.log('Deleting placeholder.js');
await fs.unlink('scripts/placeholder.js');

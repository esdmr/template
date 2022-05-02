const process = require('node:process');

const isInGitHub = Boolean(process.env.GITHUB_ACTIONS);
const hasColors = process.stderr?.hasColors?.() ?? false;
const logSymbol = hasColors ? '\x1B[94mℹ\x1B[m' : 'ℹ';
const warnSymbol = isInGitHub ? '::warning::' : hasColors ? '\x1B[93m⚠\x1B[m' : '⚠';
const errorSymbol = isInGitHub ? '::error::' : hasColors ? '\x1B[91m✖\x1B[m' : '✖';

/** @param {unknown[]} args */
exports.log = (...args) => {
	// This uses `console.warn` because it should output to the stderr.
	console.warn(logSymbol, ...args);
};

/** @param {unknown[]} args */
exports.warn = (...args) => {
	console.warn(warnSymbol, ...args);
};

/** @param {unknown[]} args */
exports.error = (...args) => {
	console.error(errorSymbol, ...args);
};

/**
 * @param {string} name
 * @param {string} value
 */
exports.setOutput = (name, value) => {
	console.log(`::set-output name=${name}::${value}`);
};

/**
 * @param {unknown} value
 * @return {value is Record<string, unknown>}
 */
exports.isObject = (value) => {
	return typeof value === 'object' && value !== null;
};

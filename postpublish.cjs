const fs = require('node:fs/promises');

main().catch(console.error);

async function main () {
	await fs.unlink('package.json');
	await fs.rename('.package.dev.json', 'package.json');
}

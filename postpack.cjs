const fs = require('node:fs/promises');

main().catch(console.error);

async function main () {
	console.log('rm package.json');
	await fs.unlink('package.json');

	console.log('mv … package.json');
	await fs.rename('.package.dev.json', 'package.json');
}

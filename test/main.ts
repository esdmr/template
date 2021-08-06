import { test } from 'tap';
import greet from '#src/main.js';

await test('greet', async (t) => {
	t.equal(greet(), 'Hello, World!',
		'expected to greet "world" if not given a parameter');

	t.equal(greet('Steve'), 'Hello, Steve!',
		'expected to greet if given a parameter');

	t.end();
});

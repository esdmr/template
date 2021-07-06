import * as _ from 'tap';
import greet from '#src/main.js';

await _.test('greet', async (_) => {
	_.equal(greet(), 'Hello, World!',
		'expected to greet "world" if not given a parameter');

	_.equal(greet('Steve'), 'Hello, Steve!',
		'expected to greet if given a parameter');

	_.end();
});

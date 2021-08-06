/**
 * "Greetings are nice things to say when people meet each other."
 * {@link https://simple.wikipedia.org/wiki/Greeting}
 *
 * @public
 * @param whom - Whom to greet
 * @returns
 */
export default function greet (whom = 'World') {
	return `Hello, ${whom}!`;
}

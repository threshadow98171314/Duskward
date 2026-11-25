// Small helpers for the interface's HTML

// An element with the given classes, holding the given children (text, or elements)
export function element<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className = '',
	...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
	const made = document.createElement(tag);
	if (className !== '') {
		made.className = className;
	}
	made.append(...children);
	return made;
}

// Forces the page to lay an element out now, so that a change made after this
// runs its transition from where the element is
export function settle(target: HTMLElement): void {
	void target.offsetWidth;
}

// What a press is: the mouse going down, or a finger touching
export const PRESS = ['mousedown', 'touchstart'];

// Calls back when an element is pressed. A handler that returns false keeps the press
// to itself: it goes no further, and the page does nothing else with it. A signal
// stops the listening.
export function onPress(target: HTMLElement, handler: (event: Event) => boolean | void, events = PRESS,
	signal?: AbortSignal): void {
	for (const type of events) {
		target.addEventListener(type, (event) => {
			if (handler(event) === false) {
				event.preventDefault();
				event.stopPropagation();
			}
		}, { signal });
	}
}

// The element pressed, or the nearest one around it that matches, inside a container
export function pressedIn(container: HTMLElement, event: Event, selector: string): HTMLElement | null {
	const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
	return target !== null && container.contains(target) ? target : null;
}

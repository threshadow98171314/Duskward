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

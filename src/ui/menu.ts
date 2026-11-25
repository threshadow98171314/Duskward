// The menu bar along the bottom of the page. Its button opens and closes it, and it
// holds the settings: the difficulty, the language, the keeper's records and the
// volume of the music and the sounds. The style sheet draws each part's heading
// from its data-heading.

import { element, onPress, PRESS } from './dom.ts';

const TAP = ['click', 'touchstart'];
const CLOSING_MS = 200;

export class MenuBar {
	constructor(private readonly bar: HTMLElement) {
		const button = bar.querySelector<HTMLElement>('.menuBtn');
		if (button !== null) {
			onPress(button, () => this.toggle(), TAP);
		}
	}

	toggle(): void {
		this.bar.classList.toggle('open');
		this.bar.classList.add('closing');
		setTimeout(() => this.bar.classList.remove('closing'), CLOSING_MS);
	}

	// Adds a part to the menu, at the end
	add(part: HTMLElement): void {
		this.bar.append(part);
	}
}

// A part of the menu, under its heading
function submenu<K extends 'ul' | 'div'>(tag: K, className: string, heading: string, ...children: HTMLElement[]) {
	const part = element(tag, className + ' submenu', ...children);
	part.dataset.heading = heading;
	return part;
}

// The difficulty: a switch for casual play. Pressing it flips it, and says which way
// it went.
export function difficultyMenu(heading: string, casual: boolean, onFlip: () => boolean): HTMLElement {
	const part = submenu('div', 'difficulty', heading, element('div', 'difficultySwitch litBorder'));
	part.classList.toggle('casual', casual);
	onPress(part, () => {
		part.classList.toggle('casual', onFlip());
	}, TAP);
	return part;
}

// The languages, the one in use picked out
export function languageMenu(heading: string, languages: { code: string; name: string }[], current: string,
	onChoose: (code: string) => void): HTMLElement {
	return submenu('ul', 'language', heading, ...languages.map(({ code, name }) => {
		const choice = element('li', 'litBorder' + (code === current ? ' selected' : ''), name);
		onPress(choice, () => {
			onChoose(code);
			return false;
		}, TAP);
		return choice;
	}));
}

// The keeper's records to open
export function recordsMenu(heading: string, records: { label: string; open: () => void }[]): HTMLElement {
	return submenu('ul', 'recordsMenu', heading, ...records.map(({ label, open }) => {
		const record = element('li', 'litBorder', label);
		onPress(record, () => {
			open();
			return false;
		}, TAP);
		return record;
	}));
}

export type Volume = 'music' | 'effects';

// The volume sliders, for the music and the sounds. A handle is dragged along its
// track; letting go sets the volume, from 0 at the left to 1 at the right.
export class VolumeSliders {
	readonly element: HTMLElement;
	private readonly handles = new Map<Volume, HTMLElement>();
	private readonly volumes = new Map<Volume, number>();
	private readonly listening = new AbortController();
	private dragging: { volume: Volume; handle: HTMLElement; left: number; width: number; at: number } | null = null;

	constructor(private readonly onChange: (volume: Volume, level: number) => void) {
		this.element = element('div', 'volumeControls', this.slider('music'), this.slider('effects'));
		// Heard on the way down, before anything on the page keeps the move to itself
		const signal = this.listening.signal;
		for (const type of ['mousemove', 'touchmove']) {
			document.addEventListener(type, (event) => this.move(event), { signal, capture: true });
		}
		for (const type of ['mouseup', 'touchend']) {
			document.addEventListener(type, () => this.letGo(), { signal, capture: true });
		}
		window.addEventListener('resize', () => this.volumes.forEach((level, volume) => this.set(volume, level)), { signal });
	}

	// Puts a handle where a volume puts it
	set(volume: Volume, level: number): void {
		this.volumes.set(volume, level);
		const handle = this.handles.get(volume) as HTMLElement;
		handle.style.transform = slide(level * trackOf(handle).offsetWidth);
	}

	// Takes the sliders off the page, and stops listening for the drags
	remove(): void {
		this.listening.abort();
		this.element.remove();
	}

	private slider(volume: Volume): HTMLElement {
		const handle = element('div', 'sliderHandle');
		this.handles.set(volume, handle);
		onPress(handle, () => {
			const track = trackOf(handle).getBoundingClientRect();
			this.dragging = { volume, handle, left: track.left + window.scrollX, width: track.width, at: (this.volumes.get(volume) ?? 0) * track.width };
		}, PRESS);
		return element('div', volume + 'Volume volumeSlider',
			element('div', 'nightSprite'), element('div', 'sliderTrack litBorder'), handle);
	}

	private move(event: Event): void {
		const dragging = this.dragging;
		if (dragging === null) {
			return;
		}
		const point = 'changedTouches' in event ? (event as TouchEvent).changedTouches[0] : event as MouseEvent;
		dragging.at = Math.min(dragging.width, Math.max(0, point.pageX - dragging.left));
		dragging.handle.style.transform = slide(dragging.at);
	}

	private letGo(): void {
		const dragging = this.dragging;
		if (dragging === null) {
			return;
		}
		this.dragging = null;
		const level = dragging.width > 0 ? dragging.at / dragging.width : 0;
		this.volumes.set(dragging.volume, level);
		this.onChange(dragging.volume, level);
	}
}

function trackOf(handle: HTMLElement): HTMLElement {
	return handle.parentElement?.querySelector('.sliderTrack') as HTMLElement;
}

function slide(x: number): string {
	return 'translate3d(' + x + 'px, 0px, 0px)';
}

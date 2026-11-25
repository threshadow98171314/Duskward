import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EndScreen } from '../src/ui/ending.ts';
import { difficultyMenu, languageMenu, MenuBar, recordsMenu, VolumeSliders } from '../src/ui/menu.ts';
import { bestiaryList, journalList, openRecord } from '../src/ui/records.ts';
import { TitleScreen } from '../src/ui/title.ts';

const TEXTS = {
	newGame: 'New game', import: 'Import', export: 'Export', delete: 'Delete', confirm: 'OK', cancel: 'Cancel',
	importCode: 'Paste a code', exportCode: 'Copy this code', areYouSure: 'Sure?', importInvalid: 'Not a save',
	day: (day: number) => 'Day ' + day,
};

// Presses an element; whether the press went on to the page
function press(target: Element, type = 'click'): boolean {
	let reachedPage = false;
	const onPage = () => {
		reachedPage = true;
	};
	document.body.addEventListener(type, onPage);
	target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	document.body.removeEventListener(type, onPage);
	return reachedPage;
}

beforeEach(() => {
	vi.useFakeTimers();
	document.body.innerHTML = '';
});

afterEach(() => {
	vi.useRealTimers();
});

describe('the title screen', () => {
	function title() {
		document.body.innerHTML = '<div id="loadingScreen"><div class="saveSpinner"></div></div>';
		const screen = document.getElementById('loadingScreen') as HTMLElement;
		const done: string[] = [];
		const titleScreen = new TitleScreen(screen, TEXTS, {
			choose: (slot) => done.push('choose ' + slot),
			exportCode: (slot) => 'CODE' + slot,
			importCode: (slot, code) => done.push('import ' + slot + ' ' + code),
			remove: (slot) => done.push('remove ' + slot),
		});
		titleScreen.show('The last lamp', [{ maxHealth: 30, day: 4, prestiged: true }, null, null]);
		return { screen, done, titleScreen, slots: () => [...screen.querySelectorAll('.saveSlots > .saveSlot')] as HTMLElement[] };
	}

	it('shows a slot for each saved game, with its hearts and its day', () => {
		const { screen, slots } = title();
		expect(screen.querySelector('.saveSpinner')?.className).toBe('saveSpinner hidden');
		expect(screen.querySelector('.subtitle')?.textContent).toBe('The last lamp');
		const [saved, empty] = slots();
		expect(saved.querySelectorAll('.slotSide > .full.heart > .mask')).toHaveLength(3);
		expect(saved.querySelector('.day')?.textContent).toBe('Day 4');
		expect(saved.querySelector('.day > .star')).not.toBeNull();
		expect([...saved.querySelectorAll('.buttons > li')].map((button) => button.className + ':' + (button as HTMLElement).title))
			.toEqual(['export:Export', 'delete:Delete']);
		expect(empty.className).toBe('saveSlot empty');
		expect(empty.querySelector('.slotSide')?.firstChild?.textContent).toBe('New game');
	});

	it('starts the game in a slot pressed, and fades away', () => {
		const { screen, done, slots } = title();
		press(slots()[1]);
		expect(done).toEqual(['choose 1']);
		expect(screen.classList.contains('hidden')).toBe(true);
		vi.advanceTimersByTime(1000);
		expect(screen.isConnected).toBe(false);
	});

	it('turns a slot over to copy its code out, and back', () => {
		const { done, slots } = title();
		const saved = slots()[0];
		expect(press(saved.querySelector('.export') as Element)).toBe(false);
		expect(saved.className).toBe('saveSlot bigView flipped');
		const code = saved.querySelector('.infoSide textarea') as HTMLTextAreaElement;
		expect(code.value).toBe('CODE0');
		expect(code.readOnly).toBe(true);
		// Pressing the back starts nothing
		press(saved.querySelector('.labelText') as Element, 'touchstart');
		expect(done).toEqual([]);
		press(saved.querySelector('.infoSide .confirm') as Element);
		expect(saved.className).toBe('saveSlot bigView');
		vi.advanceTimersByTime(500);
		expect(saved.className).toBe('saveSlot');
		expect(saved.querySelector('.infoSide')?.children).toHaveLength(0);
	});

	it('brings a code into an empty slot, and says so when it holds no save', () => {
		const { done, slots, titleScreen } = title();
		const empty = slots()[2];
		press(empty.querySelector('.import') as Element);
		(empty.querySelector('textarea') as HTMLTextAreaElement).value = 'abc';
		press(empty.querySelector('.infoSide .confirm') as Element);
		expect(done).toEqual(['import 2 abc']);
		titleScreen.rejectImport(2);
		expect(empty.querySelector('.labelText')?.textContent).toBe('Not a save');
		titleScreen.replace(2, { maxHealth: 10, day: 1, prestiged: false });
		expect(slots()[2].className).toBe('saveSlot');
		expect(slots()[2].querySelectorAll('.full.heart')).toHaveLength(1);
	});

	it('deletes a game once that is confirmed', () => {
		const { done, slots } = title();
		press(slots()[0].querySelector('.delete') as Element);
		expect(slots()[0].className).toBe('saveSlot confirmDelete flipped');
		expect(slots()[0].querySelector('.confirmText')?.textContent).toBe('Sure?');
		press(slots()[0].querySelector('.infoSide .confirm') as Element);
		expect(done).toEqual(['remove 0']);
		expect(slots()[0].className).toBe('saveSlot empty');
	});
});

describe('the end screen', () => {
	it('comes down with the counts of the game, fresh each time', () => {
		const chosen: string[] = [];
		const end = new EndScreen(document.body, { clear: 'Clear', continue: 'Play on', newGamePlus: 'Again' },
			() => chosen.push('continue'), () => chosen.push('again'));
		end.show([['Killed', 12], ['Days', 30]]);
		const panel = document.getElementById('endGame') as HTMLElement;
		expect(panel.className).toBe('down');
		expect(panel.querySelector('h2')?.textContent).toBe('Clear');
		expect([...panel.querySelectorAll('.counts > li')].map((count) => count.textContent)).toEqual(['Killed12', 'Days30']);
		press(panel.querySelector('.menu > li') as Element);
		expect(chosen).toEqual(['continue']);
		end.hide();
		expect(panel.className).toBe('');
		end.show([['Killed', 40]]);
		expect([...panel.querySelectorAll('.counts > li')].map((count) => count.textContent)).toEqual(['Killed40']);
	});
});

describe('the menu', () => {
	it('opens and closes with its button', () => {
		document.body.innerHTML = '<div class="menuBar"><div class="menuBtn"></div></div>';
		const bar = document.querySelector('.menuBar') as HTMLElement;
		new MenuBar(bar);
		press(bar.querySelector('.menuBtn') as Element);
		expect(bar.className).toBe('menuBar open closing');
		vi.advanceTimersByTime(200);
		expect(bar.className).toBe('menuBar open');
	});

	it('flips the difficulty, and picks a language', () => {
		let casual = false;
		const difficulty = difficultyMenu('Difficulty', false, () => (casual = !casual));
		document.body.append(difficulty);
		expect(difficulty.dataset.heading).toBe('Difficulty');
		press(difficulty.querySelector('.difficultySwitch') as Element);
		expect(difficulty.className).toBe('difficulty submenu casual');
		const chosen: string[] = [];
		const languages = languageMenu('Language', [{ code: 'zh-TW', name: '繁體中文' }, { code: 'en', name: 'English' }], 'zh-TW',
			(code) => chosen.push(code));
		document.body.append(languages);
		expect([...languages.children].map((choice) => choice.className)).toEqual(['litBorder selected', 'litBorder']);
		expect(press(languages.children[1])).toBe(false);
		expect(chosen).toEqual(['en']);
	});

	it('opens the records', () => {
		const opened: string[] = [];
		const records = recordsMenu('Records', [{ label: 'Journal', open: () => opened.push('journal') }]);
		document.body.append(records);
		press(records.children[0], 'touchstart');
		expect(opened).toEqual(['journal']);
	});

	it('sets a volume where a slider is let go', () => {
		const changed: string[] = [];
		const sliders = new VolumeSliders((volume, level) => changed.push(volume + ' ' + level));
		document.body.append(sliders.element);
		const handle = sliders.element.querySelector('.effectsVolume .sliderHandle') as HTMLElement;
		const track = sliders.element.querySelector('.effectsVolume .sliderTrack') as HTMLElement;
		Object.defineProperty(track, 'offsetWidth', { value: 200 });
		track.getBoundingClientRect = () => ({ left: 50, width: 200 }) as DOMRect;
		sliders.set('effects', 0.5);
		expect(handle.style.transform).toBe('translate3d(100px, 0px, 0px)');
		handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));
		expect(handle.style.transform).toBe('translate3d(200px, 0px, 0px)');
		document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
		document.dispatchEvent(new MouseEvent('mouseup'));
		expect(changed).toEqual(['effects 0.25']);
		// Taken away, it no longer listens
		sliders.remove();
		document.dispatchEvent(new MouseEvent('mouseup'));
		expect(changed).toHaveLength(1);
	});
});

describe('the records', () => {
	it('open over the game, and close with their button', () => {
		const closed: string[] = [];
		const panel = openRecord(document.body, 'Journal', journalList([
			{ day: 'Day 2', lines: [{ who: 'Sera', say: 'Hold the lamp.' }] },
		], 'Nothing yet'), 'Close', () => closed.push('closed'));
		expect(panel.className).toBe('records');
		expect(panel.querySelector('.recordsLine')?.textContent).toBe('Sera：Hold the lamp.');
		// Presses inside go no further
		expect(press(panel.querySelector('.recordsList') as Element)).toBe(false);
		press(panel.querySelector('.recordsClose') as Element);
		press(panel.querySelector('.recordsClose') as Element);
		expect(closed).toEqual(['closed']);
		vi.advanceTimersByTime(500);
		expect(panel.isConnected).toBe(false);
	});

	it('say when the journal is empty, and show only shadows of monsters not met', () => {
		expect(journalList([], 'Nothing yet').textContent).toBe('Nothing yet');
		const list = bestiaryList([
			{ known: true, name: 'Rat', stats: 'HP 5', line: 'Small.', sprite: 'rat' },
			{ known: false, name: 'Wraith', stats: 'HP 50', line: 'Cold.', sprite: 'wraith' },
			{ known: true, name: 'Dawnwyrm', stats: 'HP 400', line: 'Fallen.', boss: 'dragon' },
		]);
		const [rat, wraith, dragon] = [...list.children] as HTMLElement[];
		const sprite = rat.querySelector('.recordsSprite') as HTMLElement;
		expect(sprite.style.backgroundImage).toContain('img/monsters.png');
		expect(rat.querySelector('.recordsStats')?.textContent).toBe('HP 5');
		expect(wraith.className).toBe('recordsEntry recordsMonster unknown');
		expect(wraith.querySelector('.recordsName')?.textContent).toBe('？？？');
		expect(wraith.querySelector('.recordsSprite')).toBeNull();
		expect(dragon.querySelector('.recordsPicture')?.className).toBe('recordsPicture boss dragon');
	});
});

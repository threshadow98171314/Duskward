import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { offerChoice } from '../src/ui/choices.ts';
import { StoryBoxes } from '../src/ui/story.ts';

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

function game(): HTMLElement {
	document.body.innerHTML = '<div id="gameContainer"></div>';
	return document.getElementById('gameContainer') as HTMLElement;
}

function storyBoxes() {
	const parent = game();
	const held: string[] = [];
	const boxes = new StoryBoxes(parent, {
		tapToContinue: 'Tap', msPerCharacter: 100,
		hold: () => held.push('hold'), letGo: () => held.push('letGo'),
	});
	return { parent, held, boxes };
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('the story boxes', () => {
	it('show one at a time, each waiting for the one before it', () => {
		const { parent, boxes } = storyBoxes();
		const done: string[] = [];
		boxes.enqueue((next) => boxes.journal('Sera', 'One', () => {
			done.push('one');
			next();
		}));
		boxes.enqueue((next) => boxes.journal('Sera', 'Two', () => {
			done.push('two');
			next();
		}));
		expect([...parent.querySelectorAll('.journalText')].map((text) => text.textContent)).toEqual(['One']);
		// A journal entry goes away by itself, the longer the more it says
		vi.advanceTimersByTime(6000 + 300 - 1);
		expect(parent.querySelector('.journal')?.className).toBe('journal');
		vi.advanceTimersByTime(1);
		expect(parent.querySelector('.journal')?.className).toBe('journal hidden');
		vi.advanceTimersByTime(500);
		expect(done).toEqual(['one']);
		expect([...parent.querySelectorAll('.journalText')].map((text) => text.textContent)).toEqual(['Two']);
		// Pressed, it goes at once
		press(parent.querySelector('.journal') as Element);
		vi.advanceTimersByTime(500);
		expect(done).toEqual(['one', 'two']);
		expect(parent.children).toHaveLength(0);
	});

	it('turn the pages of the opening, and fade it away after the last', () => {
		const { parent, boxes } = storyBoxes();
		let over = false;
		boxes.intro(['First', 'Second'], () => {
			over = true;
		}, 'storyEnding');
		const intro = parent.querySelector('.storyIntro') as HTMLElement;
		expect(intro.className).toBe('storyIntro storyEnding');
		expect(intro.querySelector('.storyHint')?.textContent).toBe('Tap');
		expect(press(intro)).toBe(false);
		expect(intro.querySelector('.storyText')?.className).toBe('storyText hidden');
		vi.advanceTimersByTime(500);
		expect(intro.querySelector('.storyText')?.textContent).toBe('Second');
		press(intro);
		vi.advanceTimersByTime(500);
		expect(over).toBe(true);
		expect(intro.isConnected).toBe(false);
	});

	it('show a line beside the speaker’s portrait', () => {
		const { parent, boxes } = storyBoxes();
		boxes.line({ speaker: 'Sera', portrait: 2, text: 'Hold the lamp.' }, () => {});
		const portrait = parent.querySelector('.journal.dialogue > .dialoguePortrait') as HTMLElement;
		expect(portrait.style.backgroundImage).toContain('img/portraits.png');
		expect(portrait.style.backgroundPosition).toBe('-96px 0px');
		expect(parent.querySelector('.dialogueBody .journalSpeaker')?.textContent).toBe('Sera');
	});

	it('hold the game for a line that asks, until an answer is pressed', () => {
		const { parent, held, boxes } = storyBoxes();
		const answers: (number | null)[] = [];
		boxes.line({ speaker: 'Sera', portrait: 0, text: 'Keep it?', choices: ['Keep', 'Give'] }, (choice) => answers.push(choice));
		expect(held).toEqual(['hold']);
		const box = parent.querySelector('.journal') as HTMLElement;
		// Pressing the words does nothing, and nothing behind reacts
		expect(press(box.querySelector('.journalText') as Element)).toBe(false);
		vi.advanceTimersByTime(60000);
		expect(box.className).toBe('journal dialogue');
		press(box.querySelectorAll('.dialogueChoice')[1]);
		expect(held).toEqual(['hold', 'letGo']);
		vi.advanceTimersByTime(500);
		expect(answers).toEqual([1]);
	});

	it('forget everything when cleared, and what was on its way carries on no further', () => {
		const { parent, boxes } = storyBoxes();
		const done: string[] = [];
		boxes.enqueue((next) => boxes.journal('Sera', 'One', () => {
			done.push('one');
			next();
		}));
		boxes.enqueue((next) => boxes.journal('Sera', 'Two', () => {
			done.push('two');
			next();
		}));
		boxes.clear();
		expect(parent.children).toHaveLength(0);
		vi.advanceTimersByTime(60000);
		expect(done).toEqual([]);
		boxes.enqueue((next) => boxes.journal('Sera', 'Three', next));
		expect(parent.querySelector('.journalText')?.textContent).toBe('Three');
	});
});

describe('the choices', () => {
	it('take a blessing into the night, once two skills are picked', () => {
		const parent = game();
		const chosen: [number | null, string[] | null][] = [];
		const panel = offerChoice(parent, {
			omen: { name: 'Omen: Red moon', text: 'Monsters hit harder' },
			speaker: 'Sera', text: 'Take one?',
			skills: { title: 'Skills', skills: [{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }, { name: 'c', label: 'C' }], picked: ['a'] },
			cards: [{ name: 'Ember', gift: 'More light', price: 'Fewer moves' }, { name: 'Calm', gift: 'Quiet', price: 'None' }],
			skip: 'No thanks',
		}, (card, skills) => chosen.push([card, skills]));
		expect(panel.className).toBe('duskChoice');
		expect([...panel.children].map((child) => child.className))
			.toEqual(['choiceOmen', 'choiceSpeaker', 'choiceText', 'skillPicks', 'choiceCards', 'choiceSkip']);
		const card = panel.querySelectorAll('.choiceCard')[1] as HTMLElement;
		expect(card.textContent).toBe('CalmQuietNone');
		// One skill is not enough
		press(card);
		expect(panel.querySelector('.skillPicks')?.className).toBe('skillPicks needed');
		const picks = [...panel.querySelectorAll('.skillPick')];
		press(picks[1]);
		press(picks[2]);
		// Taking a third lets go of the first
		expect(picks.map((pick) => pick.classList.contains('picked'))).toEqual([false, true, true]);
		expect(panel.querySelector('.skillPicks')?.className).toBe('skillPicks');
		press(card);
		expect(chosen).toEqual([[1, ['b', 'c']]]);
		expect(panel.className).toBe('duskChoice hidden');
		vi.advanceTimersByTime(500);
		expect(panel.isConnected).toBe(false);
	});

	it('leave the building to the keeper when the plan is turned down', () => {
		const parent = game();
		const chosen: (number | null)[] = [];
		const panel = offerChoice(parent, {
			className: 'buildPlan', speaker: 'Sera', text: 'Which first?',
			cards: [{ name: 'Weaver', gift: 'Stone ×5' }], skip: 'You decide',
		}, (card, skills) => {
			chosen.push(card);
			expect(skills).toBeNull();
		});
		expect(panel.className).toBe('duskChoice buildPlan');
		expect(panel.querySelector('.cardPrice')).toBeNull();
		// Nothing behind the choice reacts
		expect(press(panel.querySelector('.choiceText') as Element)).toBe(false);
		press(panel.querySelector('.choiceSkip') as Element);
		press(panel.querySelector('.choiceSkip') as Element);
		expect(chosen).toEqual([null]);
	});
});

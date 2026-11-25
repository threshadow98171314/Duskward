// A choice Sera puts to the keeper, over the game: at dusk, which blessing to take
// into the night and which two skills, under tonight's omen; in the morning, which
// building to see to first. Each choice is a card, and the choice can be turned
// down. Nothing behind the panel reacts while it is open.

import { element, onPress, pressedIn, settle } from './dom.ts';

// A card: its name, what it gives, and what it costs, if anything
export interface ChoiceCard {
	name: string;
	gift: string;
	price?: string;
}

export interface ChoiceOffer {
	// The building plan's panel takes more cards
	className?: string;
	omen?: { name: string; text: string };
	speaker: string;
	text: string;
	// Skills to take into the night: two of them have to be picked
	skills?: { title: string; skills: { name: string; label: string }[]; picked: string[] };
	cards: ChoiceCard[];
	skip: string;
}

const FADE_MS = 500;
const TAP = ['click', 'touchstart'];
const SKILLS_TAKEN = 2;

// Shows a choice; done with the number of the card chosen (or null for none), and the
// skills picked, if there were skills to pick
export function offerChoice(parent: HTMLElement, offer: ChoiceOffer,
	done: (card: number | null, skills: string[] | null) => void): HTMLElement {
	const panel = element('div', ('duskChoice ' + (offer.className ?? '')).trim() + ' hidden');
	if (offer.omen !== undefined) {
		panel.append(element('div', 'choiceOmen',
			element('div', 'omenName', offer.omen.name), element('div', 'omenText', offer.omen.text)));
	}
	panel.append(element('div', 'choiceSpeaker', offer.speaker), element('div', 'choiceText', offer.text));

	// The skills picked, in the order they were picked
	let picks: HTMLElement | null = null;
	const order: string[] = [];
	if (offer.skills !== undefined) {
		const skills = offer.skills;
		picks = element('div', 'skillPicks', element('div', 'skillPicksTitle', skills.title),
			...skills.skills.map(({ name, label }) => {
				const pick = element('div', 'skillPick litBorder' + (skills.picked.includes(name) ? ' picked' : ''), label);
				pick.dataset.skill = name;
				if (skills.picked.includes(name)) {
					order.push(name);
				}
				return pick;
			}));
		panel.append(picks);
	}

	panel.append(element('div', 'choiceCards', ...offer.cards.map((card, i) => {
		const shown = element('div', 'choiceCard', element('div', 'cardName', card.name), element('div', 'cardGift', card.gift));
		if (card.price !== undefined) {
			shown.append(element('div', 'cardPrice', card.price));
		}
		shown.dataset.card = String(i);
		return shown;
	})), element('div', 'choiceSkip', offer.skip));

	const listening = new AbortController();
	onPress(panel, (event) => {
		const pick = picks === null ? null : pressedIn(panel, event, '.skillPick');
		if (pick !== null && picks !== null) {
			const name = pick.dataset.skill ?? '';
			const at = order.indexOf(name);
			if (at >= 0) {
				order.splice(at, 1);
			} else {
				order.push(name);
				// Taking a third lets go of the first
				if (order.length > SKILLS_TAKEN) {
					order.shift();
				}
			}
			picks.querySelectorAll<HTMLElement>('.skillPick').forEach((skill) => {
				skill.classList.toggle('picked', order.includes(skill.dataset.skill ?? ''));
			});
			picks.classList.remove('needed');
			return false;
		}
		const chosen = pressedIn(panel, event, '.choiceCard, .choiceSkip');
		if (chosen !== null) {
			if (picks !== null && order.length !== SKILLS_TAKEN) {
				picks.classList.add('needed');
				return false;
			}
			listening.abort();
			panel.classList.add('hidden');
			setTimeout(() => panel.remove(), FADE_MS);
			done(chosen.dataset.card === undefined ? null : Number(chosen.dataset.card), picks === null ? null : order.slice());
		}
		return false;
	}, TAP, listening.signal);

	parent.append(panel);
	settle(panel);
	panel.classList.remove('hidden');
	return panel;
}

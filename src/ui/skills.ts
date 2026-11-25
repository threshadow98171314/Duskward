// The dusk skills beside the board: the Afterglow gauge, filling as the keeper plays,
// and a button for each skill that can be cast now; once the gauge is full they are
// ready, and pressing one casts it.

import { element, onPress, pressedIn } from './dom.ts';

const SHOW_MS = 100;

// A skill that can be cast now, and its name to show
export interface SkillButton {
	name: string;
	label: string;
}

export class SkillBar {
	private bar: HTMLElement | null = null;

	constructor(private readonly board: HTMLElement, private readonly onCast: (skill: string) => void) {}

	// The skills that can be cast now; the bar comes up the first time
	setSkills(skills: SkillButton[]): void {
		const bar = this.skills();
		(bar.querySelector('.skillList') as HTMLElement).replaceChildren(...skills.map(({ name, label }) => {
			const button = element('div', 'skill litBorder ' + name, label);
			button.dataset.skill = name;
			return button;
		}));
		setTimeout(() => bar.classList.remove('hidden'), SHOW_MS);
	}

	// How full the gauge is; the skills are ready once it is full
	setGauge(current: number, max: number): void {
		if (this.bar === null) {
			return;
		}
		(this.bar.querySelector('.duskGauge .fill') as HTMLElement).style.height = current / max * 100 + '%';
		this.bar.classList.toggle('ready', current >= max);
	}

	private skills(): HTMLElement {
		if (this.bar === null) {
			const bar = this.bar = element('div', 'duskSkills hidden',
				element('div', 'duskGauge litBorder', element('div', 'fill')), element('div', 'skillList'));
			this.board.append(bar);
			onPress(bar, (event) => {
				const skill = pressedIn(bar, event, '.skill');
				if (skill === null) {
					return;
				}
				this.onCast(skill.dataset.skill ?? '');
				return false;
			}, ['click', 'touchstart']);
		}
		return this.bar;
	}
}

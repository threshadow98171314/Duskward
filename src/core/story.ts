// The story: chapters told when something happens in the game, if their
// conditions hold. A chapter is a few lines, each said by someone, and a line can
// end in a choice. Choices set flags, which later chapters (and the rest of the
// game, through consequences) can read, and can change the coming night. Each
// chapter is told once per game.

import type { Boon } from './blessings.ts';

export type Flag = string | boolean;

export type Condition =
	// The event's argument is this, or at least this
	| { arg: string | number | boolean }
	| { argAtLeast: number }
	| { atLeastDay: number }
	| { atLeastLevel: number }
	// A count kept by the game, such as DEATHS
	| { count: string; atLeast: number }
	// A choice made earlier; a flag never set counts as false
	| { flag: string; is: Flag }
	| { flag: string; not: Flag };

export interface Choice {
	// The keeper's answer, a text id
	say: string;
	set?: Record<string, Flag>;
	// What the answer changes about the coming night
	tonight?: Boon[];
	// What is said in reply to this answer
	reply?: Line[];
}

export interface Line {
	// Who speaks: a character id (see CHARACTERS in the content)
	who: string;
	// A text id
	say: string;
	choices?: Choice[];
}

export interface Chapter {
	// The game event that can start it
	on: string;
	if?: Condition[];
	lines: Line[];
	// Waits this long after the event (ms), e.g. to let a notice clear first
	delay?: number;
	// Told every time, not only the first (e.g. the ending, again in New Game+)
	again?: boolean;
}

export interface StoryState {
	day: number;
	level: number;
	counts: Record<string, number>;
	flags: Record<string, Flag>;
	told: Record<string, boolean>;
}

function holds(condition: Condition, arg: unknown, state: StoryState): boolean {
	if ('arg' in condition) {
		return arg === condition.arg;
	} else if ('argAtLeast' in condition) {
		return typeof arg === 'number' && arg >= condition.argAtLeast;
	} else if ('atLeastDay' in condition) {
		return state.day >= condition.atLeastDay;
	} else if ('atLeastLevel' in condition) {
		return state.level >= condition.atLeastLevel;
	} else if ('count' in condition) {
		return (state.counts[condition.count] ?? 0) >= condition.atLeast;
	} else if ('not' in condition) {
		return (state.flags[condition.flag] ?? false) !== condition.not;
	}
	return (state.flags[condition.flag] ?? false) === condition.is;
}

// The chapters an event starts now, in the order they are written
export function chaptersFor(chapters: Record<string, Chapter>, event: string, arg: unknown, state: StoryState): string[] {
	return Object.keys(chapters).filter((id) => {
		const chapter = chapters[id];
		return chapter.on === event && (chapter.again || !state.told[id]) &&
			(chapter.if ?? []).every((condition) => holds(condition, arg, state));
	});
}

// Applies a choice to the flags
export function choose(state: StoryState, choice: Choice): void {
	Object.assign(state.flags, choice.set ?? {});
}

// What a choice goes on doing for the rest of the game
export type Effect =
	// The sword starts each night this full
	| { type: 'nightfallSword'; share: number }
	| { type: 'wardMax'; add: number }
	| { type: 'bossHealth'; boss: string; scale: number };

export interface Consequence {
	flag: string;
	is: Flag;
	effects: Effect[];
}

// The lasting effects of the choices made so far
export function consequences(list: Consequence[], flags: Record<string, Flag>): Effect[] {
	return list.filter((consequence) => (flags[consequence.flag] ?? false) === consequence.is)
		.flatMap((consequence) => consequence.effects);
}

// Spells cast with dusk crystals, dusk skills cast with a full Afterglow gauge,
// and the lasting effects either can leave behind.

import type { SkillDef, SpellDef, StateEffectDef } from './types.ts';

export const STATE_EFFECTS = {
	freezeTime: {
		className: 'freezeTime',
		duration: 15000,
	},
	haste: {
		className: 'haste',
		duration: 30000,
	},
	timelamp: {
		className: 'freezeTime',
		duration: 10000,
	},
	frozen: {
		className: 'frozen',
		duration: 8000,
		freezesKeeper: true,
	},
} satisfies Record<string, StateEffectDef>;

export const SPELLS = {
	resetBoard: {
		use: [{ type: 'refreshBoard' }, { type: 'cue', name: 'refreshBoardSpell' }],
	},
	haste: {
		use: [{ type: 'stateEffect', effect: 'haste' }, { type: 'cue', name: 'haste' }],
	},
	phaseChange: {
		use: [{ type: 'phaseChange' }, { type: 'cue', name: 'phaseChangeSpell' }],
	},
	freezeTime: {
		use: [{ type: 'stateEffect', effect: 'freezeTime' }, { type: 'cue', name: 'freezeTime' }],
	},
} satisfies Record<string, SpellDef>;

// Unlocked by the Altar of Dawn, one per level
export const SKILLS = {
	dawnlight: {
		level: 1,
		use: {
			night: [{ type: 'damageAll', amount: 10 }, { type: 'cue', name: 'dawnlight' }],
			day: [{ type: 'harvestEach', amount: 2 }, { type: 'cue', name: 'dawnlight' }],
		},
	},
	wardcraft: {
		level: 2,
		use: [{ type: 'fillWard' }, { type: 'heal', share: 0.25 }, { type: 'cue', name: 'heal' }],
	},
	timelamp: {
		level: 3,
		use: {
			night: [{ type: 'stateEffect', effect: 'timelamp' }, { type: 'cue', name: 'freezeTime' }],
			day: [{ type: 'extendDay', moves: 5 }],
		},
	},
} satisfies Record<string, SkillDef>;

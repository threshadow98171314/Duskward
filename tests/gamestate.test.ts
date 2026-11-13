import { beforeEach, describe, expect, it } from 'vitest';
import GameState from '../src/app/gamestate.js';
import { SAVE_VERSION } from '../src/platform/save.ts';
import Base64 from '../src/vendor/base64.js';

// A save as the game wrote it before versioning
const unversioned = {
	buildings: [],
	stores: [],
	level: 3,
	xp: 12,
	dayNumber: 4,
	items: {},
	gem: 0,
	mana: 0,
	counts: {},
	prestige: 1,
	health: 50,
	prioritizedBuilding: null,
	storySeen: { day1: true },
	gauge: 0,
};

const stored = (slot: number) => JSON.parse(localStorage.getItem('slot' + slot) ?? 'null');

beforeEach(() => {
	localStorage.clear();
});

describe('save slots', () => {
	it('shows unreadable slots as empty', () => {
		expect(GameState.getSlotInfo(0)).toBe('empty');
		for (const content of ['null', 'not json', '{"hello":1}']) {
			localStorage.setItem('slot0', content);
			expect(GameState.getSlotInfo(0), content).toBe('empty');
		}
	});

	it('reads saves from before versioning', () => {
		localStorage.setItem('slot1', JSON.stringify(unversioned));
		expect(GameState.getSlotInfo(1)).toEqual({ maxHealth: GameState.maxHealth(3), day: 4, prestiged: true });
	});

	it('writes the version when saving', () => {
		localStorage.setItem('slot2', JSON.stringify(unversioned));
		GameState.load(2);
		expect(GameState.maxHealth()).toBe(GameState.maxHealth(3));
		GameState.save();
		expect(stored(2)).toMatchObject({ version: SAVE_VERSION, level: 3, dayNumber: 4 });
	});

	it('leaves an unreadable slot alone when saving persistent counts', () => {
		localStorage.setItem('slot2', JSON.stringify(unversioned));
		GameState.load(2);
		localStorage.setItem('slot2', 'damaged');
		expect(() => GameState.savePersistents()).not.toThrow();
		expect(localStorage.getItem('slot2')).toBe('damaged');
	});
});

describe('importing a save code', () => {
	it('accepts an exported save and upgrades it', () => {
		expect(GameState.import(1, Base64.encode(JSON.stringify(unversioned)))).toBe(true);
		expect(stored(1)).toEqual({ ...unversioned, version: SAVE_VERSION });
		expect(GameState.getSlotInfo(1)).toMatchObject({ day: 4 });
	});

	it('round-trips through export', () => {
		localStorage.setItem('slot0', JSON.stringify(unversioned));
		const code = GameState.getExportCode(0);
		expect(GameState.import(1, code)).toBe(true);
		expect(stored(1)).toEqual({ ...unversioned, version: SAVE_VERSION });
	});

	it('rejects codes that do not hold a save, without touching the slot', () => {
		for (const code of ['', 'not a code', Base64.encode('{"hello":1}'), Base64.encode('[1,2,3]')]) {
			expect(GameState.import(1, code), code).toBe(false);
			expect(localStorage.getItem('slot1'), code).toBeNull();
		}
	});
});

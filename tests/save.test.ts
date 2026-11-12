import { describe, expect, it } from 'vitest';
import { parseSave, SAVE_VERSION, serializeSave } from '../src/platform/save.ts';

// A save as the game wrote it before versioning
const unversioned = {
	buildings: [],
	stores: [],
	level: 3,
	xp: 12,
	dayNumber: 4,
	items: {},
	gem: 1,
	mana: 0,
	counts: { NIGHTS: 3 },
	prestige: 0,
	health: 50,
	prioritizedBuilding: null,
	storySeen: { day1: true },
	gauge: 0,
};

describe('parseSave', () => {
	it('upgrades a save from before versioning', () => {
		expect(parseSave(JSON.stringify(unversioned))).toEqual({ ...unversioned, version: SAVE_VERSION });
	});

	it('reads a current save unchanged', () => {
		const current = { ...unversioned, version: SAVE_VERSION };
		expect(parseSave(JSON.stringify(current))).toEqual(current);
	});

	it('treats missing and damaged saves as unreadable', () => {
		for (const stored of [undefined, null, '', 'not json', '{"level":', 'null', '42', '"text"', '[]', '{}']) {
			expect(parseSave(stored), String(stored)).toBeNull();
		}
	});

	it('rejects saves without the fields the game needs', () => {
		for (const field of ['level', 'xp', 'buildings', 'stores']) {
			const save: Record<string, unknown> = { ...unversioned };
			delete save[field];
			expect(parseSave(JSON.stringify(save)), field).toBeNull();
		}
		expect(parseSave(JSON.stringify({ ...unversioned, level: '3' }))).toBeNull();
		expect(parseSave(JSON.stringify({ ...unversioned, buildings: {} }))).toBeNull();
	});

	it('rejects saves from a newer version of the game', () => {
		expect(parseSave(JSON.stringify({ ...unversioned, version: SAVE_VERSION + 1 }))).toBeNull();
	});

	it('rejects malformed version numbers', () => {
		for (const version of [-1, 0.5, '1', null, true]) {
			expect(parseSave(JSON.stringify({ ...unversioned, version })), String(version)).toBeNull();
		}
	});
});

describe('serializeSave', () => {
	it('stamps the current version', () => {
		expect(JSON.parse(serializeSave(unversioned)).version).toBe(SAVE_VERSION);
		expect(JSON.parse(serializeSave({ ...unversioned, version: 0 })).version).toBe(SAVE_VERSION);
	});

	it('round-trips through parseSave', () => {
		expect(parseSave(serializeSave(unversioned))).toEqual({ ...unversioned, version: SAVE_VERSION });
	});
});

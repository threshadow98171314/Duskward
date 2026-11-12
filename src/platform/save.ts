// Save data versioning.
//
// Every save written from now on carries a version number. Reading a save runs
// the upgrade steps below one at a time until it reaches the current version, so
// a change to the save format only needs a new step, and older saves keep working.

export const SAVE_VERSION = 1;

export type SaveData = Record<string, unknown> & { version: number };

type Upgrade = (save: Record<string, unknown>) => Record<string, unknown>;

// UPGRADES[n] turns a version n save into version n + 1
const UPGRADES: Upgrade[] = [
	// 0 -> 1: saves from before versioning, unchanged apart from the version number
	(save) => save,
];

// Reads a stored save. Returns null for a save that is missing, damaged, or
// written by a newer version of the game.
export function parseSave(json: string | null | undefined): SaveData | null {
	if (json == null) {
		return null;
	}
	let data: unknown;
	try {
		data = JSON.parse(json);
	} catch {
		return null;
	}
	return upgradeSave(data);
}

export function upgradeSave(data: unknown): SaveData | null {
	if (!looksLikeSave(data)) {
		return null;
	}
	let version = data.version === undefined ? 0 : data.version;
	if (typeof version !== 'number' || !Number.isInteger(version) || version < 0 || version > SAVE_VERSION) {
		return null;
	}
	let save: Record<string, unknown> = data;
	while (version < SAVE_VERSION) {
		save = UPGRADES[version](save);
		version++;
	}
	return { ...save, version };
}

export function serializeSave(save: Record<string, unknown>): string {
	return JSON.stringify({ ...save, version: SAVE_VERSION });
}

// The fields GameState.load needs, which every save has had since the original game
function looksLikeSave(data: unknown): data is Record<string, unknown> {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		return false;
	}
	const save = data as Record<string, unknown>;
	return typeof save.level === 'number' && typeof save.xp === 'number'
		&& Array.isArray(save.buildings) && Array.isArray(save.stores);
}

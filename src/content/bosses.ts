// Bosses fight by routine, one strike after another. With nothing waiting, the
// dragon bites a keeper who comes close and spits fire at one who keeps away;
// the tiles the keeper gathers while it is out provoke its other attacks (see the
// dragonEffect of each resource). Times are in milliseconds from the start of a
// strike, matching the original animations.

import type { BossDef } from '../core/field.ts';

export const BOSSES = {
	// The Fallen Dawnwyrm, who once drew the sun across the sky
	dragon: {
		sprite: 'dragon', width: 204,
		health: 1000, damage: 4, hardness: 2, xp: 5000,
		landing: 4000, dying: 5500,
		close: 'bite', far: 'fireball', closeGap: 5,
		loot: 'dawnHeart',
		strikes: {
			fireball: { lands: 800, ends: 800, damage: 4 },
			bite: { lands: 800, ends: 800, scaled: true, within: 5 },
			iceBeam: { lands: 900, ends: 1100, freeze: true },
			fireBlast: { lands: 1100, ends: 1100, damage: 4, burn: { width: 30, damage: 2, every: 200, lasts: 10000 } },
			wingBuffet: { lands: 600, ends: 1600, push: 150, clearsFire: true },
		},
	},
} satisfies Record<string, BossDef>;

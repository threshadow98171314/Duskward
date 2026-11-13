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
	// The Eclipse, the dark that eats the sun. It hangs in the middle of the sky, out
	// of the keeper's reach, and holds back the dawn while it is there. Only lantern
	// light hurts it (see the wounds of the lantern tile); the keeper's other tiles
	// stir it to strike.
	eclipse: {
		sprite: 'eclipse', width: 64,
		health: 400, damage: 3, hardness: 0, xp: 10000,
		landing: 3000, dying: 4000,
		aloft: true, holdsNight: true,
		close: 'gaze', far: 'gaze', closeGap: 0,
		strikes: {
			// A slow beam of black light
			gaze: { lands: 1500, ends: 4000, scaled: true },
			// Shadow rain: its spawn drop to the ground
			shadowRain: { lands: 600, ends: 1200, summon: { monster: 'eclipsespawn', count: 2 } },
			// Eclipse light eats into the ward
			eclipseLight: { lands: 800, ends: 1200, damage: 5, prey: 'ward' },
			// The eclipse itself: tiles fall into shadow
			eclipse: { lands: 800, ends: 1200, bind: 3 },
		},
	},
} satisfies Record<string, BossDef>;

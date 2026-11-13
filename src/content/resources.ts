// The kinds of resource tile. Each has a one-letter code on the board and a
// class name used everywhere else, does something different at night, and is
// multiplied in the stores by the buildings that work it.

import type { ResourceDef } from './types.ts';

export const RESOURCES = {
	Grain: {
		char: 'g',
		className: 'grain',
		provokes: { dragon: 'wingBuffet', eclipse: 'shadowRain' },
		nightEffect: {
			'castle': 'spawn:demon',
			'fort': 'spawn:earthElemental',
			'house': 'spawn:hauntedArmour',
			'default': 'spawn:zombie'
		},
		multipliers: {
			house: 2,
			fort: 3,
			castle: 4
		},
		effectDest: {
			day: [-20, 10],
			night: 'side'
		}
	},
	Wood: {
		char: 'w',
		className: 'wood',
		nightEffect: {
			'default': 'shield'
		},
		multipliers: {
			sawmill: 1,
			sawmill2: 1,
			sawmill3: 2,
			sawmill4: 2,
			sawmill5: 2,
			sawmill6: 3,
			sawmill7: 3,
			sawmill8: 3
		},
		effectDest: {
			day: [32, -20],
			night: [-20, -15]
		}
	},
	Stone: {
		char: 's',
		className: 'stone',
		nightEffect: {
			'default': 'sword'
		},
		multipliers: {
			blacksmith: 1,
			blacksmith2: 1,
			blacksmith3: 2,
			blacksmith4: 2,
			blacksmith5: 2,
			blacksmith6: 3,
			blacksmith7: 3,
			blacksmith8: 3
		},
		effectDest: {
			day: [32, -20],
			night: 'sword'
		}
	},
	Clay: {
		char: 'c',
		className: 'clay',
		provokes: { dragon: 'iceBeam', eclipse: 'eclipseLight' },
		nightEffect: {
			'bricklayer4': 'spawn:imp',
			'bricklayer3': 'spawn:waterElemental',
			'bricklayer2': 'spawn:spider',
			'default': 'spawn:rat'
		},
		multipliers: {
			bricklayer: 1,
			bricklayer2: 2,
			bricklayer3: 3,
			bricklayer4: 4
		},
		effectDest: {
			day: [32, -20],
			night: 'side'
		}
	},
	Cloth: {
		char: 'l',
		className: 'cloth',
		provokes: { dragon: 'fireBlast', eclipse: 'eclipse' },
		nightEffect: {
			'weaver4': 'spawn:warlock',
			'weaver3': 'spawn:fireElemental',
			'weaver2': 'spawn:lizardman',
			'default': 'spawn:skeleton'
		},
		multipliers: {
			weaver: 1,
			weaver2: 2,
			weaver3: 3,
			weaver4: 4
		},
		effectDest: {
			day: [32, -20],
			night: 'side'
		}
	},
	Mana: {
		char: 'm',
		className: 'mana',
		nightEffect: {
			'default': 'spawn:lich',
		},
		multipliers: {},
		effectDest: {
			day: [30, 505],
			night: 'side'
		}
	},
	Lantern: {
		char: 'f',
		className: 'lantern',
		nightEffect: {
			'default': 'dawn'
		},
		// Lighting lanterns at night draws lampmoths
		attracts: 'lampmoth',
		// Lantern light pierces the Eclipse
		wounds: { eclipse: 25 },
		multipliers: {},
		effectDest: {
			day: [32, -20],
			night: 'side'
		}
	}
} satisfies Record<string, ResourceDef>;

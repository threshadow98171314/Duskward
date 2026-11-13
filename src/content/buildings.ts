// Everything the keeper can build. Costs are in full blocks of a resource, and
// position is where the building stands, in pixels from the left of the world.
// Upgrades replace the building before them; base buildings are the keeper's home.

import type { BuildingDef } from './types.ts';

export const BUILDINGS = {
	Shack: {
		className: 'shack',
		spriteName: 'shack',
		position: 30,
		cost: {},
		requiredLevel: 1,
		animationFrames: 1,
		priority: 1,
		isBase: true,
		onBuilt: { type: 'stockpile', rows: 3, columns: 3 }
	},

	House: {
		className: 'house',
		spriteName: 'shack',
		position: 30,
		cost: {},
		requiredLevel: 4,
		prestigeDependency: 'blacksmith',
		animationFrames: 1,
		tileMod: 'grain',
		tileLevel: 2,
		replaces: 'shack',
		defaultAnimation: 1,
		priority: 1,
		isBase: true,
		onBuilt: { type: 'stockpile', rows: 4, columns: 3 }
	},

	Fort: {
		className: 'fort',
		spriteName: 'shack',
		position: 30,
		cost: {},
		requiredLevel: 7,
		prestigeDependency: 'blacksmith3',
		animationFrames: 1,
		tileMod: 'grain',
		tileLevel: 3,
		replaces: 'house',
		defaultAnimation: 2,
		priority: 1,
		isBase: true,
		onBuilt: { type: 'stockpile', rows: 4, columns: 4 }
	},

	Castle: {
		className: 'castle',
		spriteName: 'shack',
		position: 30,
		cost: {},
		requiredLevel: 10,
		prestigeDependency: 'blacksmith6',
		animationFrames: 1,
		tileMod: 'grain',
		tileLevel: 4,
		replaces: 'fort',
		defaultAnimation: 3,
		priority: 1,
		isBase: true,
		onBuilt: { type: 'stockpile', rows: 5, columns: 4 }
	},

	BrickLayer: {
		className: 'bricklayer',
		spriteName: 'bricklayer',
		position: 90,
		cost: {
			stone: 5,
			wood: 5
		},
		requiredLevel: 1,
		priority: 1
	},

	Bricklayer2: {
		className: 'bricklayer2',
		spriteName: 'bricklayer',
		position: 90,
		cost: {
			stone: 3,
			wood: 3,
			cloth: 3
		},
		requiredLevel: 1,
		tileMod: 'clay',
		tileLevel: 2,
		replaces: 'bricklayer',
		defaultAnimation: 1,
		priority: 4
	},

	Bricklayer3: {
		className: 'bricklayer3',
		spriteName: 'bricklayer',
		position: 90,
		cost: {
			stone: 5,
			wood: 5,
			cloth: 5
		},
		requiredLevel: 1,
		tileMod: 'clay',
		tileLevel: 3,
		replaces: 'bricklayer2',
		defaultAnimation: 2,
		priority: 6
	},

	Bricklayer4: {
		className: 'bricklayer4',
		spriteName: 'bricklayer',
		position: 90,
		cost: {
			stone: 8,
			wood: 8,
			cloth: 8
		},
		requiredLevel: 1,
		tileMod: 'clay',
		tileLevel: 4,
		replaces: 'bricklayer3',
		defaultAnimation: 3,
		priority: 9
	},

	Weaver: {
		className: 'weaver',
		spriteName: 'weaver',
		position: 150,
		cost: {
			stone: 5,
			wood: 5
		},
		requiredLevel: 1,
		priority: 2
	},

	Weaver2: {
		className: 'weaver2',
		spriteName: 'weaver',
		position: 150,
		cost: {
			wood: 3,
			stone: 3,
			clay: 3
		},
		requiredLevel: 1,
		tileMod: 'cloth',
		tileLevel: 2,
		replaces: 'weaver',
		defaultAnimation: 1,
		priority: 4
	},

	Weaver3: {
		className: 'weaver3',
		spriteName: 'weaver',
		position: 150,
		cost: {
			wood: 5,
			stone: 5,
			clay: 5
		},
		requiredLevel: 1,
		tileMod: 'cloth',
		tileLevel: 3,
		replaces: 'weaver2',
		defaultAnimation: 2,
		priority: 6
	},

	Weaver4: {
		className: 'weaver4',
		spriteName: 'weaver',
		position: 150,
		cost: {
			wood: 8,
			stone: 8,
			clay: 8
		},
		requiredLevel: 1,
		tileMod: 'cloth',
		tileLevel: 4,
		replaces: 'weaver3',
		defaultAnimation: 3,
		priority: 9
	},

	Blacksmith: {
		className: 'blacksmith',
		spriteName: 'blacksmith',
		position: 210,
		cost: {
			wood: 2,
			clay: 2
		},
		requiredLevel: 1,
		tileMod: 'stone',
		tileLevel: 2,
		priority: 3
	},

	Blacksmith2: {
		className: 'blacksmith2',
		spriteName: 'blacksmith',
		position: 210,
		cost: {
			wood: 2,
			clay: 5,
			cloth: 5
		},
		requiredLevel: 1,
		tileMod: 'stone',
		tileLevel: 3,
		replaces: 'blacksmith',
		defaultAnimation: 1,
		priority: 5
	},

	Blacksmith3: {
		className: 'blacksmith3',
		spriteName: 'blacksmith',
		position: 210,
		cost: {
			wood: 2,
			clay: 8,
			cloth: 8
		},
		requiredLevel: 1,
		tileMod: 'stone',
		tileLevel: 4,
		replaces: 'blacksmith2',
		defaultAnimation: 2,
		priority: 6
	},

	Blacksmith4: {
		className: 'blacksmith4',
		spriteName: 'blacksmith',
		position: 210,
		cost: {
			wood: 4,
			clay: 8,
			cloth: 8
		},
		requiredLevel: 1,
		tileMod: 'stone',
		tileLevel: 5,
		replaces: 'blacksmith3',
		defaultAnimation: 3,
		priority: 7
	},

	Blacksmith5: {
		className: 'blacksmith5',
		spriteName: 'blacksmith',
		position: 210,
		cost: {
			wood: 6,
			clay: 8,
			cloth: 8
		},
		requiredLevel: 1,
		tileMod: 'stone',
		tileLevel: 6,
		replaces: 'blacksmith4',
		defaultAnimation: 4,
		priority: 8
	},

	Blacksmith6: {
		className: 'blacksmith6',
		spriteName: 'blacksmith',
		position: 210,
		cost: {
			wood: 6,
			clay: 10,
			cloth: 10
		},
		requiredLevel: 1,
		tileMod: 'stone',
		tileLevel: 7,
		replaces: 'blacksmith5',
		defaultAnimation: 5,
		priority: 9
	},

	Blacksmith7: {
		className: 'blacksmith7',
		spriteName: 'blacksmith',
		position: 210,
		cost: {
			wood: 8,
			clay: 10,
			cloth: 10
		},
		requiredLevel: 1,
		tileMod: 'stone',
		tileLevel: 8,
		replaces: 'blacksmith6',
		defaultAnimation: 6,
		priority: 10
	},

	Blacksmith8: {
		className: 'blacksmith8',
		spriteName: 'blacksmith',
		position: 210,
		cost: {
			wood: 10,
			clay: 10,
			cloth: 10
		},
		requiredLevel: 1,
		tileMod: 'stone',
		tileLevel: 9,
		replaces: 'blacksmith7',
		defaultAnimation: 7,
		priority: 11
	},

	Sawmill: {
		className: 'sawmill',
		spriteName: 'sawmill',
		position: 270,
		cost: {
			stone: 2,
			cloth: 2
		},
		requiredLevel: 1,
		tileMod: 'wood',
		tileLevel: 2,
		priority: 3
	},

	Sawmill2: {
		className: 'sawmill2',
		spriteName: 'sawmill',
		position: 270,
		cost: {
			stone: 2,
			clay: 5,
			cloth: 5
		},
		requiredLevel: 1,
		tileMod: 'wood',
		tileLevel: 3,
		replaces: 'sawmill',
		defaultAnimation: 1,
		priority: 5
	},

	Sawmill3: {
		className: 'sawmill3',
		spriteName: 'sawmill',
		position: 270,
		cost: {
			stone: 2,
			clay: 8,
			cloth: 8
		},
		requiredLevel: 1,
		tileMod: 'wood',
		tileLevel: 4,
		replaces: 'sawmill2',
		defaultAnimation: 2,
		priority: 6
	},

	Sawmill4: {
		className: 'sawmill4',
		spriteName: 'sawmill',
		position: 270,
		cost: {
			stone: 4,
			clay: 8,
			cloth: 8
		},
		requiredLevel: 1,
		tileMod: 'wood',
		tileLevel: 5,
		replaces: 'sawmill3',
		defaultAnimation: 3,
		priority: 7
	},

	Sawmill5: {
		className: 'sawmill5',
		spriteName: 'sawmill',
		position: 270,
		cost: {
			stone: 6,
			clay: 8,
			cloth: 8
		},
		requiredLevel: 1,
		tileMod: 'wood',
		tileLevel: 6,
		replaces: 'sawmill4',
		defaultAnimation: 4,
		priority: 8
	},

	Sawmill6: {
		className: 'sawmill6',
		spriteName: 'sawmill',
		position: 270,
		cost: {
			stone: 6,
			clay: 10,
			cloth: 10
		},
		requiredLevel: 1,
		tileMod: 'wood',
		tileLevel: 7,
		replaces: 'sawmill5',
		defaultAnimation: 5,
		priority: 9
	},

	Sawmill7: {
		className: 'sawmill7',
		spriteName: 'sawmill',
		position: 270,
		cost: {
			stone: 8,
			clay: 10,
			cloth: 10
		},
		requiredLevel: 1,
		tileMod: 'wood',
		tileLevel: 8,
		replaces: 'sawmill6',
		defaultAnimation: 6,
		priority: 10
	},

	Sawmill8: {
		className: 'sawmill8',
		spriteName: 'sawmill',
		position: 270,
		cost: {
			stone: 10,
			clay: 10,
			cloth: 10
		},
		requiredLevel: 1,
		tileMod: 'wood',
		tileLevel: 9,
		replaces: 'sawmill7',
		defaultAnimation: 7,
		priority: 11
	},

	Tower: {
		className: 'tower',
		spriteName: 'tower',
		position: 330,
		cost: {},
		requiredLevel: 1,
		priority: 1,
		requiredGems: 4,
		onBuilt: { type: 'enableMagic' }
	},

	Lighthouse: {
		className: 'lighthouse',
		spriteName: 'lighthouse',
		position: 390,
		cost: {
			stone: 4,
			wood: 4,
			clay: 2
		},
		requiredLevel: 3,
		priority: 4,
		onBuilt: { type: 'wardCapacity' }
	},

	Lighthouse2: {
		className: 'lighthouse2',
		spriteName: 'lighthouse',
		position: 390,
		cost: {
			stone: 6,
			clay: 4,
			lantern: 4
		},
		requiredLevel: 1,
		tileMod: 'lantern',
		tileLevel: 2,
		replaces: 'lighthouse',
		defaultAnimation: 1,
		priority: 7,
		onBuilt: { type: 'wardCapacity' }
	},

	Lighthouse3: {
		className: 'lighthouse3',
		spriteName: 'lighthouse',
		position: 390,
		cost: {
			stone: 8,
			cloth: 6,
			lantern: 8
		},
		requiredLevel: 1,
		tileMod: 'lantern',
		tileLevel: 3,
		replaces: 'lighthouse2',
		defaultAnimation: 2,
		priority: 10,
		onBuilt: { type: 'wardCapacity' }
	},

	Altar: {
		className: 'altar',
		spriteName: 'altar',
		position: 450,
		cost: {
			stone: 3,
			cloth: 3,
			lantern: 3
		},
		requiredLevel: 1,
		requires: 'lighthouse',
		priority: 5,
		onBuilt: { type: 'enableSkills' }
	},

	Altar2: {
		className: 'altar2',
		spriteName: 'altar',
		position: 450,
		cost: {
			wood: 6,
			cloth: 6,
			lantern: 6
		},
		requiredLevel: 1,
		replaces: 'altar',
		defaultAnimation: 1,
		priority: 8,
		onBuilt: { type: 'enableSkills' }
	},

	Altar3: {
		className: 'altar3',
		spriteName: 'altar',
		position: 450,
		cost: {
			clay: 8,
			cloth: 8,
			lantern: 10
		},
		requiredLevel: 1,
		replaces: 'altar2',
		defaultAnimation: 2,
		priority: 11,
		onBuilt: { type: 'enableSkills' }
	}
} satisfies Record<string, BuildingDef>;

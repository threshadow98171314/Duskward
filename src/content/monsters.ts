// The monsters that come at night. Gathering tiles calls them up (see the
// nightEffect of each resource), and the dragon is called with its horn.

export const MONSTER_IDS = [
	'zombie', 'rat', 'skeleton', 'hauntedArmour', 'lizardman', 'spider', 'earthElemental',
	'fireElemental', 'waterElemental', 'demon', 'warlock', 'imp', 'lich', 'dragon',
] as const;

// What gathering a tile can make the dragon do
export const DRAGON_ATTACKS = ['WingBuffet', 'IceBeam', 'FireBlast'] as const;

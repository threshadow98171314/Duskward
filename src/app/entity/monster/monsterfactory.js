import Zombie from './zombie.js';
import Rat from './rat.js';
import Skeleton from './skeleton.js';
import HauntedArmour from './hauntedarmour.js';
import Lizardman from './lizardman.js';
import Spider from './spider.js';
import EarthElemental from './earthelemental.js';
import FireElemental from './fireelemental.js';
import WaterElemental from './waterelemental.js';
import Demon from './demon.js';
import Warlock from './warlock.js';
import Imp from './imp.js';
import Lich from './lich.js';
import Dragon from './dragon.js';

export default {
	_monsters: {
		"zombie": Zombie,
		"rat": Rat,
		"skeleton": Skeleton,
		"hauntedArmour": HauntedArmour,
		"lizardman": Lizardman,
		"spider": Spider,
		"earthElemental": EarthElemental,
		"fireElemental": FireElemental,
		"waterElemental": WaterElemental,
		"demon": Demon,
		"warlock": Warlock,
		"imp": Imp,
		"lich": Lich,
		"dragon": Dragon
	},
	
	getMonster: function(name, options) {
		var monster = this._monsters[name];
		if(monster != null) {
			return new monster(options);
		}
		return null;
	}
};

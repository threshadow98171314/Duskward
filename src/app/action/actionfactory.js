import MoveBlock from './moveblock.js';
import RaiseBuilding from './raisebuilding.js';
import MoveTo from './moveto.js';
import Attack from './attack.js';
import Die from './die.js';
import FastAttack from './fastattack.js';
import Shoot from './shoot.js';
import GetLoot from './getloot.js';
import Climb from './climb.js';
import LichSpell from './lichspell.js';
import Teleport from './teleport.js';
import Land from './dragon/land.js';
import Bite from './dragon/bite.js';
import Fireball from './dragon/fireball.js';
import WingBuffet from './dragon/wingbuffet.js';
import Slide from './slide.js';
import IceBeam from './dragon/icebeam.js';
import FireBlast from './dragon/fireblast.js';
import DragonDie from './dragon/die.js';
import { register } from '../modules.js';

var ActionFactory = {
	// A function rather than a map: some actions import this factory back, so
	// they may not have loaded yet when this module runs
	_actions: function() {
		return {
			"MoveBlock": MoveBlock,
			"RaiseBuilding": RaiseBuilding,
			"MoveTo": MoveTo,
			"Attack": Attack,
			"FastAttack": FastAttack,
			"Shoot": Shoot,
			"Die": Die,
			"GetLoot": GetLoot,
			"Climb": Climb,
			"LichSpell": LichSpell,
			"Teleport": Teleport,
			"Land": Land,
			"Bite": Bite,
			"Fireball": Fireball,
			"WingBuffet": WingBuffet,
			"Slide": Slide,
			"IceBeam": IceBeam,
			"FireBlast": FireBlast,
			"DragonDie": DragonDie
		};
	},

	getAction: function(actionName, options) {
		var action = this._actions()[actionName];
		if(action != null) {
			return new action(options);
		}
		return null;
	}
};

register('action/actionfactory', ActionFactory);
export default ActionFactory;

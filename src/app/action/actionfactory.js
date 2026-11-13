import Land from './dragon/land.js';
import Bite from './dragon/bite.js';
import Fireball from './dragon/fireball.js';
import WingBuffet from './dragon/wingbuffet.js';
import IceBeam from './dragon/icebeam.js';
import FireBlast from './dragon/fireblast.js';
import DragonDie from './dragon/die.js';

// The dragon's actions. Everyone else acts on the field (src/core/field.ts).
var ActionFactory = {
	// A function rather than a map: some actions import this factory back, so
	// they may not have loaded yet when this module runs
	_actions: function() {
		return {
			"Land": Land,
			"Bite": Bite,
			"Fireball": Fireball,
			"WingBuffet": WingBuffet,
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

export default ActionFactory;

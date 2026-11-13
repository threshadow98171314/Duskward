import Dragon from './dragon.js';

// The dragon is the one monster still built as its own entity; the rest live on
// the field (src/core/field.ts), drawn by FieldMonster.
export default {
	_monsters: function() {
		return {
			"dragon": Dragon
		};
	},

	getMonster: function(name, options) {
		var monster = this._monsters()[name];
		if(monster != null) {
			return new monster(options);
		}
		return null;
	}
};

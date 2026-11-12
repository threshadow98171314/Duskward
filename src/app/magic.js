import E from './eventmanager.js';
import State from './gamestate.js';
import Content from './gamecontent.js';

var MANA_COST = 3;

function castSpell(spellName) {
	if(State.mana >= MANA_COST) {
		State.mana -= MANA_COST;
		E.trigger('updateMana', [State.mana, State.maxMana()]);
		Content.Spells[spellName].onUse();
		State.count('CAST', 1);
	}
}

export default {
	init: function() {
		E.bind("castSpell", castSpell);
	}
};

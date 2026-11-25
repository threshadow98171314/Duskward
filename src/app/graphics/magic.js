import E from '../eventmanager.js';
import State from '../gamestate.js';
import G from './graphics.js';
import C from '../gamecontent.js';
import { LastingEffects, MagicMenu } from '../../ui/magic.ts';

// The magic button and its spells, and the lasting effects beside it (src/ui/magic.ts)

var MANA_COST = 3;

var menu = null;
var lasting = null;

export default {
	init: function() {
		menu = new MagicMenu(G.board(), Object.keys(C.Spells), function() {
			return State.mana >= MANA_COST;
		}, function(spell) {
			E.trigger('castSpell', [spell]);
		});
		lasting = new LastingEffects(G.board());
		E.bind('updateMana', function(current, total) {
			menu.setMana(current, total);
		});
		// Pressing anything else closes the spells
		E.bind('toggleMenu', function() {
			menu.close();
		});
		E.bind('newStateEffect', function(effect) {
			lasting.add(effect.className, effect.duration);
		});
		E.bind('endStateEffect', function(effect) {
			lasting.remove(effect.className);
		});
		E.bind('enableMagic', function() {
			menu.setMana(State.mana, State.maxMana());
		});
	}
};

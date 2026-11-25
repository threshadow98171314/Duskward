import E from '../eventmanager.js';
import O from '../gameoptions.js';
import Graphics from './graphics.js';
import { difficultyMenu } from '../../ui/menu.ts';

// The difficulty in the menu (src/ui/menu.ts): a switch for casual play

var _el = null;

// Flips casual play, and says which way it went
function flip() {
	O.set('casualMode', !O.get('casualMode', false));
	E.trigger('difficultyChanged', [O.get('casualMode', false)]);
	return O.get('casualMode', false);
}

export default {
	init: function() {
		if(_el) {
			_el.remove();
		}
		_el = difficultyMenu(Graphics.getText('DIFFICULTY'), O.get('casualMode', false), flip);
		Graphics.addToMenu(_el);
	}
};

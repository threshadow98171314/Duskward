import E from '../eventmanager.js';
import O from '../gameoptions.js';
import Graphics from './graphics.js';

var G = null, _el = null;

function el() {
	if(_el == null) {
		G.addStyleRule('.difficulty:before', 'content:"- ' + G.getText('DIFFICULTY') + ' -";');
		_el = G.make('difficulty submenu').append(G.make('difficultySwitch litBorder'));
		G.addToMenu(_el);
	}
	return _el;
}

function toggleSwitch() {
	O.set('casualMode', !O.get('casualMode', false));
	syncSwitch();
	E.trigger('difficultyChanged', [O.get('casualMode', false)]);
}

function syncSwitch() {
	el().toggleClass('casual', O.get('casualMode', false));
}

export default {
	init: function() {
		G = Graphics;
		if(_el) {
			_el.remove();
		}
		_el = null;
		el().off().on('click touchstart', toggleSwitch)
		syncSwitch();
	}
}

import E from '../eventmanager.js';
import G from './graphics.js';

var _el = null;
function el() {
	if(_el == null) {
		_el = G.make('world');
		G.addToBoard(_el);
	}
	return _el;
}

export default {
	init: function() {
		_el = null;
		el();
	},
	
	attachHandler: function(event, element, handler) {
		if(element) {
			el().on(event, element, handler);
		} else {
			el().on(event, handler);
		}
	},
	
	add: function(thing) {
		el().append(thing);
	},
	
	remove: function(thing) {
		thing.remove();
	}
};

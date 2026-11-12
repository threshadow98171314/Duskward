import E from '../eventmanager.js';
import GameState from '../gamestate.js';
import G from './graphics.js';

var _el = null;
function el() {
	if (_el == null) {
		_el = G.make("resources");
		G.hide(_el);
		G.addToWorld(_el);
		for(var i in GameState.stores) {
			var block = GameState.stores[i];
			addResource(block);
			G.updateBlock(block);
		}
		setTimeout(function() {
			G.show(_el);
		}, 10);
	}
	return _el;
}

function addResource(block) {
	_el.append(block.el());
}

function drawResources() {
	el();
}

export default {
	init: function() {
		_el = null;
		
		E.bind("addResource", addResource);
		E.bind("resourceInit", drawResources);
	}
};

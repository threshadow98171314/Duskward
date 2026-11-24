import G from './graphics.js';
import { SkyView } from '../../render/sky.ts';

// The world above the board. The sky is drawn on a canvas behind everything else in
// it (src/render/sky.ts); what lives in the world is still HTML, for now.

var _el = null;
var sky = null;

function el() {
	if(_el == null) {
		_el = G.make('world');
		G.addToBoard(_el);
		makeSky();
	}
	return _el;
}

function makeSky() {
	var canvas = G.make('skyCanvas', 'canvas').prependTo(_el);
	if(sky != null) {
		sky.stop();
	}
	sky = new SkyView(canvas[0], { width: _el.width(), height: _el.height() });
	// The sky follows the page: night and dusk fall on the body
	var page = document.body.classList;
	sky.setNight(page.contains('night'), false);
	sky.setDusk(page.contains('dusk'), false);
	sky.beforeDraw = function() {
		sky.setNight(page.contains('night'));
		sky.setDusk(page.contains('dusk'));
	};
	sky.start();
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
	},

	sky: function() {
		el();
		return sky;
	}
};

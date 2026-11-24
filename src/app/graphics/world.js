import G from './graphics.js';
import BoardGraphics from './gameboard.js';
import { SkyView } from '../../render/sky.ts';
import { VillageView } from '../../render/village.ts';

// The world above the board. The sky is drawn on a canvas behind everything else in
// it (src/render/sky.ts), and the village's buildings on another in front of the
// sky (src/render/village.ts); the keeper, the monsters and the rest are still HTML.

var _el = null;
var sky = null;
var village = null;

function el() {
	if(_el == null) {
		_el = G.make('world');
		G.addToBoard(_el);
		makeSky();
		makeVillage();
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

function makeVillage() {
	var canvas = G.make('villageCanvas', 'canvas').insertAfter(_el.children('.skyCanvas'));
	if(village != null) {
		village.stop();
	}
	village = new VillageView(canvas[0], { width: _el.width(), height: _el.height() });
	// Buildings fade into the night; the colours of the materials follow the tiles' levels
	var page = document.body.classList;
	village.setNight(page.contains('night'), false);
	village.beforeDraw = function() {
		village.setNight(page.contains('night'));
		village.levels = BoardGraphics.levels();
	};
	village.start();
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
	},

	village: function() {
		el();
		return village;
	}
};

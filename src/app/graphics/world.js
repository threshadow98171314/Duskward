import G from './graphics.js';
import BoardGraphics from './gameboard.js';
import { SkyView } from '../../render/sky.ts';
import { VillageView } from '../../render/village.ts';
import { ActorsView } from '../../render/actors.ts';

// The world above the board, drawn on canvases: the sky behind everything else
// (src/render/sky.ts), the village's buildings in front of it (src/render/village.ts),
// and the keeper, the monsters, the chests and what flies between them in front of
// the buildings (src/render/actors.ts), and behind them the dragon or the Eclipse
// while it is out (src/render/dragon.ts, src/render/eclipse.ts).

var _el = null;
var sky = null;
var village = null;
var actors = null;

function el() {
	if(_el == null) {
		_el = G.make('world');
		G.addToBoard(_el);
		makeSky();
		makeVillage();
		makeActors();
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

function makeActors() {
	var canvas = G.make('actorsCanvas', 'canvas').insertAfter(_el.children('.villageCanvas'));
	if(actors != null) {
		actors.stop();
	}
	actors = new ActorsView(canvas[0], { width: _el.width(), height: _el.height() });
	// The keeper wears their night sprite by night; a carried block takes its tiles' colour
	var page = document.body.classList;
	actors.setNight(page.contains('night'), false);
	actors.beforeDraw = function() {
		actors.setNight(page.contains('night'));
		actors.levels = BoardGraphics.levels();
	};
	actors.start();
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
	},

	actors: function() {
		el();
		return actors;
	},

	// What lights the night in the world: where the keeper carries their lantern, and
	// the village's lit windows; null before the world is made
	lights: function() {
		if(_el == null) {
			return null;
		}
		return { keeper: actors.keeperX(), windows: sky.lightsAt() };
	}
};

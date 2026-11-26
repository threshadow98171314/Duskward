import BoardGraphics from './gameboard.js';
import GameState from '../gamestate.js';
import Resources from '../resources.js';
import { SkyView } from '../../render/sky.ts';
import { VillageView } from '../../render/village.ts';
import { ActorsView } from '../../render/actors.ts';
import { element } from '../../ui/dom.ts';

// The world above the board, drawn on canvases: the sky behind everything else
// (src/render/sky.ts), the village's buildings and stockpile in front of it (src/render/village.ts),
// and the keeper, the monsters, the chests and what flies between them in front of
// the buildings (src/render/actors.ts), and behind them the dragon or the Eclipse
// while it is out (src/render/dragon.ts, src/render/eclipse.ts).

var _el = null;
var sky = null;
var village = null;
var actors = null;

function el() {
	if(_el == null) {
		_el = element('div', 'world');
		BoardGraphics.el().appendChild(_el);
		makeSky();
		makeVillage();
		makeActors();
	}
	return _el;
}

// The world's size, as laid out on the page
function sizeOf(world) {
	var style = getComputedStyle(world);
	return { width: parseFloat(style.width), height: parseFloat(style.height) };
}

function makeSky() {
	var canvas = element('canvas', 'skyCanvas');
	_el.prepend(canvas);
	if(sky != null) {
		sky.stop();
	}
	sky = new SkyView(canvas, sizeOf(_el));
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

// A block in the stockpile, as the village draws it
function stored(block) {
	return { key: block, kind: block.options.type.className, share: block.quantity() / block.max };
}

// Asks the game what the keeper works towards next (see World.plan)
var plan = null;
var shownNext = null;

// Whether any materials have been delivered to a building
function delivered(building) {
	var cost = building.options.type.cost;
	return Object.keys(cost).some(function(kind) {
		return building.requiredResources[kind] < cost[kind];
	});
}

// The building the keeper works towards next shows from the start: its bars, with
// what is on its way to it, and its outline where it will stand; or, for an
// upgrade, the building it upgrades lifts for it, and settles again if the keeper
// turns to something else before anything is delivered
function follow(next, bars) {
	if(next !== shownNext) {
		var before = shownNext && shownNext.getReplaces(GameState);
		if(before && !delivered(shownNext)) {
			village.setUpgrade(before, null);
		}
		var replaces = next && next.getReplaces(GameState);
		if(replaces) {
			village.setUpgrade(replaces, next);
		}
		shownNext = next;
	}
	village.setNext(next, next != null && next.getReplaces(GameState) == null);
	if(next != null) {
		village.setCosts(next, bars);
	}
}

function makeVillage() {
	var canvas = element('canvas', 'villageCanvas');
	_el.querySelector(':scope > .skyCanvas').after(canvas);
	if(village != null) {
		village.stop();
	}
	village = new VillageView(canvas, sizeOf(_el));
	// Buildings fade into the night; the colours of the materials follow the tiles' levels.
	// The stockpile shows the stores once the village has them.
	var page = document.body.classList;
	village.setNight(page.contains('night'), false);
	village.beforeDraw = function() {
		village.setNight(page.contains('night'));
		village.levels = BoardGraphics.levels();
		village.stockpile = Resources.loaded ? GameState.stores.map(stored) : null;
		var next = plan ? plan() : null;
		follow(next && next.next, next && next.bars);
	};
	village.start();
}

function makeActors() {
	var canvas = element('canvas', 'actorsCanvas');
	_el.querySelector(':scope > .villageCanvas').after(canvas);
	if(actors != null) {
		actors.stop();
	}
	actors = new ActorsView(canvas, sizeOf(_el));
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
	// Options: plan, which asks what the keeper works towards next
	init: function(opts) {
		plan = (opts && opts.plan) || null;
		shownNext = null;
		_el = null;
		el();
	},

	// The world's element
	element: function() {
		return el();
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

import E from './eventmanager.js';
import Graphics from './graphics/graphics.js';
import WorldGraphics from './graphics/world.js';
import { EclipseView } from '../render/eclipse.ts';

// The Eclipse in the middle of the sky, and the show of each of its strikes. It is
// drawn in front of the village, behind the keeper and the monsters
// (src/render/eclipse.ts), and the rays and the shadow it sends down with the effects
// (src/render/effects.ts). What it does and when is up to the field
// (src/core/field.ts).

var SIZE = 64;
var TOP = 6;
// Its shadow drops from just under it, its gaze lands on the keeper, and lantern
// light comes up at it from the board
var DROPS_FROM = 66;
var KEEPER_Y = 96;
var BOARD_Y = 110;

var view = null;
var timers = [];

function later(callback, delay) {
	timers.push(setTimeout(callback, delay));
}

function center() {
	return { x: Graphics.worldWidth() / 2, y: TOP + SIZE / 2 };
}

export default {
	appear: function() {
		view = new EclipseView(center());
		WorldGraphics.actors().boss = view;
		E.trigger('roar');
	},

	strike: function(name) {
		if(view == null) {
			return;
		}
		switch(name) {
		case 'gaze':
			view.feel('gazing', 1500);
			break;
		case 'shadowRain':
			// Drops of shadow fall towards both edges, where its spawn will land
			var xs = [];
			for(var i = 0; i < 6; i++) {
				xs.push(center().x + (i - 2.5) * 14);
			}
			Graphics.effects().shadowRain(xs, DROPS_FROM);
			view.feel('flare', 600);
			break;
		case 'eclipseLight':
			view.feel('flare', 800);
			break;
		case 'eclipse':
			view.feel('darken', 1200);
			E.trigger('charge');
			break;
		}
	},

	land: function(name, keeperX) {
		if(name == 'gaze') {
			if(view != null) {
				Graphics.effects().ray('black', center(), { x: keeperX, y: KEEPER_Y }, 300);
			}
			E.trigger('explodeFire');
		} else if(name == 'eclipseLight') {
			E.trigger('ice');
		}
	},

	// Lantern light pierces it
	pierce: function() {
		if(view == null) {
			return;
		}
		var from = center();
		Graphics.effects().ray('lantern', from, { x: from.x + (Math.random() - 0.5) * 40, y: BOARD_Y }, 400);
		view.feel('struck', 300);
		E.trigger('sunBurst');
	},

	dying: function() {
		if(view == null) {
			return;
		}
		view.breakApart();
		E.trigger('roar');
		later(function() {
			E.trigger('dragonExplode');
			document.body.classList.add('dawnBreaks');
		}, 2500);
	},

	remove: function() {
		timers.forEach(clearTimeout);
		timers = [];
		if(view != null) {
			var actors = WorldGraphics.actors();
			if(actors.boss === view) {
				actors.boss = null;
			}
			view = null;
		}
		document.body.classList.remove('dawnBreaks');
	}
};

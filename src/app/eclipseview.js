import $ from '../vendor/jquery.js';
import E from './eventmanager.js';
import Graphics from './graphics/graphics.js';

// The Eclipse as drawn: a black sun ringed with stolen light in the middle of the
// sky, and the show of each of its strikes. What it does and when is up to the
// field (src/core/field.ts).

var SIZE = 64;
var TOP = 6;

var el = null;
var timers = [];

function later(callback, delay) {
	timers.push(setTimeout(callback, delay));
}

function center() {
	return { x: Graphics.worldWidth() / 2, y: TOP + SIZE / 2 };
}

// A line of light between the Eclipse and a point on the ground
function ray(className, x, y, lasts) {
	var from = center();
	var dx = x - from.x, dy = y - from.y;
	var line = Graphics.make(className).css({
		left: from.x + 'px',
		top: from.y + 'px',
		width: Math.sqrt(dx * dx + dy * dy) + 'px',
		transform: 'rotate(' + Math.atan2(dy, dx) + 'rad)'
	}).appendTo('.world');
	later(function() {
		line.remove();
	}, lasts);
}

function flash(className, lasts) {
	if(el == null) {
		return;
	}
	el.addClass(className);
	later(function() {
		el && el.removeClass(className);
	}, lasts);
}

export default {
	appear: function() {
		el = Graphics.make('eclipse hidden').css('left', (center().x - SIZE / 2) + 'px').appendTo('.world');
		el.css('opacity'); // Force a reflow so the transition runs
		el.removeClass('hidden');
		E.trigger('roar');
	},

	strike: function(name) {
		switch(name) {
		case 'gaze':
			flash('gazing', 1500);
			break;
		case 'shadowRain':
			// Drops of shadow fall towards both edges, where its spawn will land
			for(var i = 0; i < 6; i++) {
				var drop = Graphics.make('shadowDrop').css('left', (center().x + (i - 2.5) * 14) + 'px').appendTo('.world');
				later(drop.remove.bind(drop), 700);
			}
			flash('flare', 600);
			break;
		case 'eclipseLight':
			flash('flare', 800);
			break;
		case 'eclipse':
			flash('darken', 1200);
			E.trigger('charge');
			break;
		}
	},

	land: function(name, keeperX) {
		if(name == 'gaze') {
			ray('eclipseBeam', keeperX, 96, 300);
			E.trigger('explodeFire');
		} else if(name == 'eclipseLight') {
			E.trigger('ice');
		}
	},

	// Lantern light pierces it
	pierce: function() {
		var from = center();
		ray('pierceBeam', from.x + (Math.random() - 0.5) * 40, 110, 400);
		flash('struck', 300);
		E.trigger('sunBurst');
	},

	dying: function() {
		if(el == null) {
			return;
		}
		el.addClass('breaking');
		E.trigger('roar');
		later(function() {
			E.trigger('dragonExplode');
			$('body').addClass('dawnBreaks');
		}, 2500);
	},

	remove: function() {
		timers.forEach(clearTimeout);
		timers = [];
		if(el != null) {
			el.remove();
			el = null;
		}
		$('.eclipseBeam, .pierceBeam, .shadowDrop').remove();
		$('body').removeClass('dawnBreaks');
	}
};

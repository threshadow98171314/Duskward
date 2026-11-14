import $ from '../vendor/jquery.js';
import E from './eventmanager.js';
import State from './gamestate.js';
import Graphics from './graphics/graphics.js';
import { sunBite } from '../core/day.ts';

// What the long night does to the world in view. The Eclipse eats a little more
// of the sun every day until the keeper takes it back (the bite is drawn over the
// sun, see .celestial:after), and by night, when the buildings fade into the dark,
// each one standing keeps a light burning.

var FLICKER_SPREAD = 0.7;

function biteTheSun() {
	var sun = $('.celestial');
	if(sun.length > 0) {
		sun[0].style.setProperty('--bite', sunBite(State.dayNumber - (State.sunWholeOn || 1)));
	}
}

function lightTheVillage() {
	var lights = $('.world .villageLights');
	if(lights.length == 0) {
		lights = Graphics.make('villageLights').appendTo('.world');
	}
	lights.empty();
	State.buildings.forEach(function(building, i) {
		if(building.built && !building.obsolete) {
			Graphics.make('villageLight')
				.css({ left: building.p() + 'px', 'animation-delay': -(i * FLICKER_SPREAD) + 's' })
				.appendTo(lights);
		}
	});
}

export default {
	init: function() {
		$('.villageLights').remove();
		E.bind('dayBreak', biteTheSun);
		E.bind('gameLoaded', lightTheVillage);
		E.bind('phaseChange', lightTheVillage);
		E.bind('buildingComplete', lightTheVillage);
	}
};

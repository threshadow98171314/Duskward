import E from './eventmanager.js';
import State from './gamestate.js';
import Graphics from './graphics/graphics.js';
import { sunBite } from '../core/day.ts';

// What the long night does to the world in view. The Eclipse eats a little more
// of the sun every day until the keeper takes it back, and by night, when the
// buildings fade into the dark, each one standing keeps a light burning. Both are
// drawn in the sky (src/render/sky.ts).

function biteTheSun() {
	Graphics.setSunBite(sunBite(State.dayNumber - (State.sunWholeOn || 1)));
}

function lightTheVillage() {
	var lights = [];
	State.buildings.forEach(function(building) {
		if(building.built && !building.obsolete) {
			lights.push(building.p());
		}
	});
	Graphics.setVillageLights(lights);
}

export default {
	init: function() {
		E.bind('dayBreak', biteTheSun);
		E.bind('gameLoaded', lightTheVillage);
		E.bind('phaseChange', lightTheVillage);
		E.bind('buildingComplete', lightTheVillage);
	}
};

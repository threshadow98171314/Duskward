import E from './eventmanager.js';
import State from './gamestate.js';
import Content from './gamecontent.js';
import BlessingGraphics from './graphics/blessings.js';
import { BLESSINGS } from '../content/blessings.ts';
import { nightModifiers, offerBlessings } from '../core/blessings.ts';

// Each dusk, Sera offers a choice of blessings for the coming night (see
// src/core/blessings.ts), and once the Altar of Dawn has unlocked every dusk
// skill, the keeper picks the two to take into the night. The game waits while
// the keeper chooses.

var SKILLS_TAKEN = 2;

// The blessing for the coming night, and the day it was chosen on
var tonight = null;
var chosenOn = null;

function unlockedSkills() {
	return Object.keys(Content.Skills).filter(function(name) {
		return Content.Skills[name].level <= State.skillLevel();
	});
}

// Whether the keeper has more dusk skills than can be taken into the night
function mustChooseSkills() {
	return unlockedSkills().length > SKILLS_TAKEN;
}

function offer() {
	if(chosenOn === State.dayNumber) {
		// Dusk can lift and fall again (the time lamp); one choice a day
		return;
	}
	chosenOn = State.dayNumber;
	var ids = offerBlessings(BLESSINGS, {
		day: State.dayNumber,
		seed: State.seed,
		altar: State.skillLevel() > 0
	});
	var skills = null;
	if(mustChooseSkills()) {
		var unlocked = unlockedSkills();
		var loadout = (State.loadout || []).filter(function(name) {
			return unlocked.indexOf(name) >= 0;
		});
		skills = { unlocked: unlocked, loadout: loadout.length == SKILLS_TAKEN ? loadout : unlocked.slice(0, SKILLS_TAKEN) };
	}
	E.trigger('hold');
	BlessingGraphics.offer(ids, skills, function(id, loadout) {
		tonight = id;
		if(loadout) {
			State.loadout = loadout;
		}
		// Lets go of the hold, and of an automatic pause that came while choosing
		E.trigger('unpause');
		E.trigger('blessingChosen', [id]);
	}, BLESSINGS);
}

export default {
	init: function() {
		tonight = null;
		chosenOn = null;
		BlessingGraphics.init();
		E.bind('duskFall', offer);
		E.bind('dayBreak', function() {
			tonight = null;
			BlessingGraphics.clear();
		});
	},

	// What tonight's blessing changes; nothing, if there is none
	modifiers: function() {
		return nightModifiers(tonight ? BLESSINGS[tonight] : null);
	},

	// Whether a dusk skill can be cast now: at night, only the ones taken into it
	canCast: function(skillName, night) {
		return !night || !mustChooseSkills() || (State.loadout || []).indexOf(skillName) >= 0;
	}
};

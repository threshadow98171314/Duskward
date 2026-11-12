import E from './eventmanager.js';
import State from './gamestate.js';
import StoryGraphics from './graphics/story.js';
import Graphics from './graphics/graphics.js';

var JOURNAL_DELAY = 3500; // Let the "Day N" notice clear first
var EVENT_DELAY = 1500;

var newGame = false;

function G() {
	return Graphics;
}

// Each story entry is shown once per save slot
function markSeen(id) {
	State.storySeen = State.storySeen || {};
	if(State.storySeen[id]) {
		return false;
	}
	State.storySeen[id] = true;
	return true;
}

function tell(id, delay) {
	var text = G().getText('JOURNAL')[id];
	if(text && markSeen(id)) {
		setTimeout(function() {
			StoryGraphics.showJournal(G().getText('SERA'), text);
		}, delay || 0);
	}
}

function handleGameLoaded() {
	if(newGame) {
		newGame = false;
		StoryGraphics.showIntro(G().getText('STORY_INTRO'));
	}
	if(State.counts && State.counts.DEATHS > 0) {
		tell('firstDeath', EVENT_DELAY);
	}
}

export default {
	init: function() {
		StoryGraphics.init();
		E.bind('newGame', function() {
			newGame = true;
		});
		E.bind('gameLoaded', handleGameLoaded);
		E.bind('dayBreak', function(dayNumber) {
			tell('day' + dayNumber, JOURNAL_DELAY);
		});
		E.bind('phaseChange', function(toNight) {
			if(toNight) {
				tell('firstNight', EVENT_DELAY);
			}
		});
		E.bind('levelUp', function(level) {
			tell('level' + level, EVENT_DELAY);
		});
		E.bind('enableMagic', function() {
			tell('magic', EVENT_DELAY);
		});
		E.bind('lootGained', function(lootName) {
			if(lootName == 'shard') {
				tell('firstShard', EVENT_DELAY);
			}
		});
		E.bind('callDragon', function() {
			tell('dragon');
		});
		E.bind('duskFall', function() {
			tell('firstDusk', EVENT_DELAY);
		});
		E.bind('buildingComplete', function(building) {
			tell(building.options.type.className, EVENT_DELAY);
		});
		E.bind('powerCreated', function() {
			tell('firstPower', EVENT_DELAY);
		});
		E.bind('gaugeChanged', function(current, max) {
			if(current >= max) {
				tell('skillReady', EVENT_DELAY);
			}
		});
	}
};

import E from './eventmanager.js';
import State from './gamestate.js';
import StoryGraphics from './graphics/story.js';
import Graphics from './graphics/graphics.js';
import { CHAPTERS } from '../content/story.ts';
import { chaptersFor, choose } from '../core/story.ts';

// The story at work: game events start the chapters written in
// src/content/story.ts (see src/core/story.ts for how), which play as dialogue.
// Each chapter is told once per game; choices are kept as story flags.

var newGame = false;

function G() {
	return Graphics;
}

function storyState() {
	State.storySeen = State.storySeen || {};
	State.storyFlags = State.storyFlags || {};
	State.storyLog = State.storyLog || [];
	return {
		day: State.dayNumber,
		level: State.level,
		counts: State.counts || {},
		flags: State.storyFlags,
		told: State.storySeen
	};
}

// Something happened: tells whatever chapters it starts
function happen(event, arg) {
	var state = storyState();
	chaptersFor(CHAPTERS, event, arg, state).forEach(function(id) {
		var chapter = CHAPTERS[id];
		state.told[id] = true;
		State.storyLog.push([id, State.dayNumber]);
		setTimeout(function() {
			StoryGraphics.tell(chapter.lines, function(choice) {
				choose(storyState(), choice);
				E.trigger('storyChoice', [id, choice.set || {}]);
			});
		}, chapter.delay || 0);
	});
}

function handleGameLoaded() {
	if(newGame) {
		newGame = false;
		StoryGraphics.showIntro(G().getText('STORY_INTRO'));
	}
	happen('gameLoaded');
}

// Game events the story listens to, with the argument its conditions read
var EVENTS = {
	dayBreak: function(day) { return day; },
	phaseChange: function(toNight) { return toNight; },
	levelUp: function(level) { return level; },
	lootGained: function(lootName) { return lootName; },
	buildingComplete: function(building) { return building.options.type.className; },
	monsterSpawned: function(kind) { return kind; },
	chainCombo: function(chain) { return chain; },
	enableMagic: null,
	duskFall: null,
	powerCreated: null,
	bounty: null,
	callDragon: null,
	dragonDefeated: null,
	eclipseArrives: null,
	dawnHeartWaits: null
};

export default {
	init: function() {
		StoryGraphics.init();
		E.bind('newGame', function() {
			newGame = true;
		});
		E.bind('gameLoaded', handleGameLoaded);
		Object.keys(EVENTS).forEach(function(event) {
			E.bind(event, function() {
				happen(event, EVENTS[event] ? EVENTS[event].apply(null, arguments) : undefined);
			});
		});
		E.bind('gaugeChanged', function(current, max) {
			if(current >= max) {
				happen('gaugeFull');
			}
		});
	},

	// What the keeper chose, e.g. whether the traveler stayed
	flag: function(name) {
		return (State.storyFlags || {})[name];
	}
};

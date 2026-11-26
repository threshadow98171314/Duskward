import E from './eventmanager.js';
import State from './gamestate.js';
import GameBoard from './gameboard.js';
import Graphics from './graphics/graphics.js';
import BoardGraphics from './graphics/gameboard.js';
import WorldGraphics from './graphics/world.js';
import StoryGraphics from './graphics/story.js';
import Plan from './plan.js';
import { SPRITES } from '../content/sprites.ts';
import { CoachRing, around } from '../ui/coach.ts';

// The first day, shown step by step. A new game asks first, once the opening has
// been told: Sera offers to show the keeper around, and the answer decides. Each
// step is a box from Sera that waits its turn among the story's boxes (src/ui/story.ts),
// with a ring around what it is about (src/ui/coach.ts). A step that asks for
// something stays until it is done; one that only tells has a button to go on; every
// one can stop the tutorial. Whenever the day runs out, the steps about the day are
// moot, and the tutorial goes on to the night. It is not saved: a game loaded later
// does not go on with it.

// A new game was just made
var fresh = false;
var night = false;
// What the engine lets the tutorial ask of the game: what the keeper works towards
// next, and the time of day
var asks = { plan: null, clock: null };
var ring = null;
// The step under way: where it is in the steps, what it found out as it began, what
// closes its box, whether it waits for the night, and where to go on from instead
var tour = null;

function text() {
	return Graphics.getText.apply(Graphics, arguments);
}

// Whether the keeper has a mouse, to rest on things for their tips
function hasMouse() {
	return typeof window.matchMedia == 'function' && window.matchMedia('(hover: hover)').matches;
}

// Where things are on the screen, for the ring

function elementRect(selector) {
	var found = document.querySelector(selector);
	return found ? found.getBoundingClientRect() : null;
}

function cellsRect(cells) {
	return around(cells.map(function(cell) {
		return BoardGraphics.cellRect(cell);
	}));
}

function stockpileRect() {
	var village = WorldGraphics.village();
	if(village.pileShownAt() <= 0) {
		return null;
	}
	var frame = village.pileFrame();
	return village.toClient({ left: frame.left, top: frame.top, width: frame.width + 2, height: frame.height + 2 });
}

// A building yet to be raised: its bars, and its outline where it will stand
function buildingRect(building) {
	var village = WorldGraphics.village();
	return around([village.toClient(village.barsOf(building)), village.toClient(village.outlineOf(building))]);
}

function sunRect() {
	var sun = WorldGraphics.sky().sun();
	var sprite = SPRITES.sun;
	return sun.shown ? WorldGraphics.village().toClient({ left: sun.x - sprite.width / 2, top: sun.y, width: sprite.width, height: sprite.height }) : null;
}

// The steps, in order. Each says what Sera says and what the ring goes around; it
// may look at the game as it begins (prepare), be passed over, start something once
// its box comes up (show) and stop it once the box goes (end). Steps with next only
// tell; the others end once the game reports that what they ask is done.
var STEPS = [
	{
		// Swap two tiles into a line: the two to try nudge towards each other
		id: 'match',
		prepare: function(data) {
			data.move = GameBoard.hint();
		},
		text: function() {
			return text('TUTORIAL_MATCH');
		},
		show: function(data) {
			if(data.move) {
				Graphics.hintMove(data.move[0], data.move[1]);
			}
		},
		target: function(data) {
			return data.move ? cellsRect(data.move) : elementRect('.boardCanvas');
		},
		end: function() {
			Graphics.hintMove(null);
		}
	},
	{
		id: 'hunger',
		next: true,
		text: function() {
			return text('TUTORIAL_HUNGER');
		},
		target: function() {
			return elementRect('.hearts');
		}
	},
	{
		id: 'stockpile',
		next: true,
		below: true,
		text: function() {
			return text('TUTORIAL_STOCKPILE');
		},
		target: stockpileRect
	},
	{
		// The building the keeper works towards next; asking for it first ends the step too
		id: 'building',
		next: true,
		below: true,
		prepare: function(data) {
			var plan = asks.plan ? asks.plan() : null;
			data.building = plan ? plan.next : null;
		},
		passOver: function(data) {
			return data.building == null;
		},
		text: function(data) {
			return text('TUTORIAL_BUILDING', Plan.buildingName(data.building.options.type.className));
		},
		target: function(data) {
			return buildingRect(data.building);
		}
	},
	{
		id: 'sun',
		next: true,
		below: true,
		prepare: function(data) {
			var clock = asks.clock ? asks.clock() : null;
			data.left = clock ? clock.left : 0;
		},
		text: function(data) {
			return text('TUTORIAL_SUN', data.left) + (hasMouse() ? text('TUTORIAL_SUN_MOUSE') : '');
		},
		target: sunRect
	},
	{
		// Waits for the night
		id: 'night',
		night: true,
		next: true,
		text: function() {
			return text('TUTORIAL_NIGHT');
		},
		target: function() {
			return elementRect('.boardCanvas');
		}
	},
	{
		id: 'end',
		night: true,
		next: true,
		text: function() {
			return text('TUTORIAL_END') + (hasMouse() ? text('TUTORIAL_END_MOUSE') : '');
		}
	}
];

var FIRST_NIGHT_STEP = STEPS.findIndex(function(step) {
	return step.night;
});

function begin(index) {
	var step = STEPS[index];
	if(!step) {
		stop();
		return;
	}
	var data = {};
	tour = { index: index, data: data, close: null, waiting: false, jump: null };
	if(step.night && !night) {
		tour.waiting = true;
		return;
	}
	if(step.prepare) {
		step.prepare(data);
	}
	if(step.passOver && step.passOver(data)) {
		begin(index + 1);
		return;
	}
	var current = tour;
	tour.close = StoryGraphics.coach({
		text: step.text(data),
		next: step.next ? text('TUTORIAL_NEXT') : undefined,
		skip: text('TUTORIAL_SKIP'),
		below: !!step.below
	}, function() {
		if(tour === current) {
			if(step.show) {
				step.show(data);
			}
			ring.follow(step.target ? function() {
				return step.target(data);
			} : null);
		}
	}, function(how) {
		if(step.end) {
			step.end(data);
		}
		if(tour !== current) {
			return;
		}
		ring.follow(null);
		if(how == 'skip') {
			stop();
		} else {
			begin(current.jump != null ? current.jump : index + 1);
		}
	});
}

// What a step asks has been done: its box goes, and the tutorial goes on
function done(id) {
	if(tour && !tour.waiting && STEPS[tour.index].id == id && tour.close) {
		tour.close();
	}
}

// Night has fallen: the steps about the day are moot
function nightfall() {
	night = true;
	if(tour == null) {
		return;
	}
	if(tour.index >= FIRST_NIGHT_STEP) {
		if(tour.waiting) {
			begin(tour.index);
		}
	} else if(tour.waiting || tour.close == null) {
		begin(FIRST_NIGHT_STEP);
	} else {
		tour.jump = FIRST_NIGHT_STEP;
		tour.close();
	}
}

function stop() {
	var current = tour;
	tour = null;
	if(ring) {
		ring.follow(null);
	}
	if(current && current.close) {
		current.close();
	}
}

// Sera offers to show a new keeper around. The tutorial takes the place of the first
// morning's journal entry, which she says instead to a keeper who needs no showing.
function ask() {
	State.storySeen = State.storySeen || {};
	State.storyLog = State.storyLog || [];
	if(!State.storySeen.day1) {
		State.storySeen.day1 = true;
		State.storyLog.push(['day1', State.dayNumber]);
	}
	StoryGraphics.tell([{
		who: 'sera',
		say: 'tutorialAsk',
		choices: [
			{ say: 'tutorialYes', reply: [{ who: 'sera', say: 'tutorialStart' }] },
			{ say: 'tutorialNo', reply: [{ who: 'sera', say: 'day1' }] }
		]
	}], function(choice) {
		if(choice.say == 'tutorialYes') {
			begin(0);
		}
	});
}

export default {
	// Options: plan and clock, which ask what the keeper works towards next and the time of day
	init: function(opts) {
		asks.plan = (opts && opts.plan) || null;
		asks.clock = (opts && opts.clock) || null;
		tour = null;
		night = false;
		fresh = false;
		if(ring == null) {
			ring = new CoachRing(document);
		}
		ring.follow(null);
		E.bind('newGame', function() {
			fresh = true;
		});
		E.bind('gameLoaded', function() {
			if(fresh) {
				fresh = false;
				ask();
			}
		});
		E.bind('tilesCleared', function(gathered, side, moved) {
			if(moved) {
				done('match');
			}
		});
		E.bind('prioritize', function() {
			done('building');
		});
		E.bind('phaseChange', function(toNight) {
			if(toNight) {
				nightfall();
			} else {
				night = false;
			}
		});
	},

	// The step under way, by its name; null when there is none
	step: function() {
		return tour ? STEPS[tour.index].id : null;
	},

	stop: stop
};

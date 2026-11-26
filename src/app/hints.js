import E from './eventmanager.js';
import GameBoard from './gameboard.js';
import Graphics from './graphics/graphics.js';

// Hints for a player who has stopped: after a while without a move, the board points
// one out, its two tiles nudging towards each other (src/core/board.ts picks the move
// that clears the most). Only while the player could move: not while a chain plays
// out, day turns to night or the game waits on a choice. A press on the board or a
// move takes the hint away and starts the wait over.

var IDLE_MS = 10000;
var CHECK_MS = 250;

// Asks the engine whether the player could make a move now
var canMove = null;
var idleMs = IDLE_MS;
// When the player last did something, or last could not move
var since = 0;
var shown = false;
var timer = null;

function rest() {
	since = Date.now();
	if(shown) {
		shown = false;
		Graphics.hintMove(null);
	}
}

// The board changed under the hint, e.g. a shade bound a tile: point out a move
// that is still there
function again() {
	if(shown) {
		var move = GameBoard.hint();
		if(move) {
			Graphics.hintMove(move[0], move[1]);
		} else {
			rest();
		}
	}
}

function check() {
	if(canMove == null || !canMove()) {
		rest();
		return;
	}
	if(!shown && Date.now() - since >= idleMs) {
		var move = GameBoard.hint();
		if(move) {
			shown = true;
			Graphics.hintMove(move[0], move[1]);
		} else {
			since = Date.now();
		}
	}
}

export default {
	// Options: canMove, which asks whether the player could make a move now
	init: function(opts) {
		canMove = (opts && opts.canMove) || null;
		shown = false;
		since = Date.now();
		clearInterval(timer);
		timer = setInterval(check, CHECK_MS);
		E.bind('tilesSwapped', rest);
		E.bind('refreshBoard', rest);
		E.bind('drawEffect', again);
		E.bind('drawRemoveEffect', again);
	},

	// The player pressed the board
	rest: rest,

	// Whether a move is pointed out now
	showing: function() {
		return shown;
	},

	// How long the player rests before a move is pointed out, in ms; without one, the usual while
	setDelay: function(ms) {
		idleMs = ms == null ? IDLE_MS : ms;
	}
};

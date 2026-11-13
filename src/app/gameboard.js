import $ from '../vendor/jquery.js';
import EventManager from './eventmanager.js';
import Resources from './resources.js';
import Content from './gamecontent.js';
import State from './gamestate.js';
import { getModule } from './modules.js';
import * as Board from '../core/board.ts';
import { createRandom } from '../core/random.ts';

// The rules live in src/core/board.ts. This module keeps the board for the game,
// turns what the rules report into events and draw requests, and waits for each
// animation to finish before settling the next wave.

var board = null;
var random = null;
var swapSide = null;
var lastSwitch = null;
var moved = false;
var checkQueued = false;

var GameBoard = {
	SEP: 'X',
	options : {
		rows : 8,
		columns : 8
	},
	init : function(opts) {
		// Tests and replays can pass their own random number generator
		random = opts && opts.random ? opts.random : createRandom();
		$.extend(this.options, opts);
		Resources.loaded = false;
		board = Board.createBoard(this.options.rows, this.options.columns);
		lastSwitch = null;
		checkQueued = false;

		EventManager.bind("refreshBoard", refreshBoard);
		EventManager.bind("createTileEffect", createEffect);
		EventManager.bind("tilesSwapped", expireEffects);
		EventManager.bind("dayBreak", releaseAllBinds);
		EventManager.bind("afterUnpaused", function() {
			if(checkQueued) {
				checkMatches();
			}
		});

		window.tiles = function() {
			for(var row = 0; row < board.rows; row++) {
				console.log(board.tiles.slice(row * board.columns, (row + 1) * board.columns).join(''));
			}
		};
	},

	switchTiles: function(pos1, pos2) {
		var cb = checkMatches;
		if(!pos1 && !pos2 && lastSwitch) {
			// We are reverting a switch
			pos1 = lastSwitch.pos2;
			pos2 = lastSwitch.pos1;
			cb = function() {};
		}

		swapSide = pos1.col < GameBoard.options.columns / 2 ? 'left' : 'right';
		lastSwitch = {
			pos1: pos1,
			pos2: pos2
		};
		Board.swapTiles(board, { row: pos1.row, column: pos1.col }, { row: pos2.row, column: pos2.col });
		moved = true;

		getModule('engine').setGraphicsCallback(cb);
		EventManager.trigger('draw', ['board.swap', {
			pos1: pos1,
			pos2: pos2
		}]);
	},

	addEffectRandomly: function(effectType) {
		createEffect(random.int(GameBoard.options.rows), random.int(GameBoard.options.columns), effectType);
	},

	bindRandomTile: function() {
		GameBoard.addEffectRandomly('shadowBind');
	},

	isBound: function(row, col) {
		return Board.isBound(board, { row: row, column: col });
	},

	availableTiles: function() {
		return Object.keys(tileMap());
	},

	canMove: function() {
		return true;
	},

	shouldDrawResourceEffect: function(resourceType) {
		return resourceType == Content.ResourceType.Grain || State.hasBase();
	}
};

// How likely each kind of tile is to appear; buildings unlock more kinds
function tileMap() {
	var map = {
		'g' : 2,
		'w' : 2,
		's' : 2
	};

	if(State.hasBuilding(Content.BuildingType.BrickLayer)) {
		map.c = 2;
	}
	if(State.hasBuilding(Content.BuildingType.Weaver)) {
		map.l = 2;
	}
	if(State.hasBuilding(Content.BuildingType.Lighthouse)) {
		map.f = 1;
	}

	return map;
}

// The board graphics take the tiles column by column, each column ending in SEP
function tileString() {
	var s = '';
	for(var col = 0; col < board.columns; col++) {
		for(var row = 0; row < board.rows; row++) {
			s += Board.tileAt(board, row, col);
		}
		s += GameBoard.SEP;
	}
	return s;
}

function fill() {
	Board.fillBoard(board, tileMap(), random);
	getModule('engine').setGraphicsCallback(function(){});
	EventManager.trigger("draw", ['board.fill', tileString()]);
}

function noMoreMoves() {
	// Refresh the board and incur penalties
	refreshBoard();
	EventManager.trigger('noMoreMoves');
}

function refreshBoard() {
	board.effects.fill(null);
	board.pendingPowers = [];
	getModule('engine').setGraphicsCallback(fill);
	EventManager.trigger("draw", ['board.clear', {}]);
}

function checkMatches() {
	var Engine = getModule('engine');
	if(Engine.paused) {
		checkQueued = true;
		return;
	}
	checkQueued = false;

	var hadPowers = board.pendingPowers.length > 0;
	var wave = Board.resolveWave(board, {
		weights: tileMap(),
		gems: !Engine.isNight() && State.magicEnabled()
	}, random);

	wave.placed.forEach(function(power) {
		drawEffect(power.row, power.column, power.type);
	});
	if(hadPowers) {
		EventManager.trigger('powerCreated');
	}

	if(wave.matched) {
		if(lastSwitch) {
			State.count('SWAPPED', 1);
		}
		wave.bursts.forEach(announceBurst);
		wave.released.forEach(function(position) {
			drawRemoveEffect(position.row, position.column, 'shadowBind');
		});

		var resourcesGained = {};
		for(var tile in wave.gathered) {
			resourcesGained[Content.getResourceType(tile).className] = wave.gathered[tile];
		}
		lastSwitch = null;

		Engine.setGraphicsCallback(checkMatches);
		EventManager.trigger('draw', ['board.match', {
			removed: wave.removed.map(function(cleared) {
				return {
					position: { row: cleared.row, col: cleared.column },
					type: cleared.tile ? Content.getResourceType(cleared.tile) : null
				};
			}),
			added: wave.added.map(function(added) {
				return { row: added.row, col: added.column, char: added.tile };
			}),
			isNight: Engine.isNight(),
			side: swapSide
		}]);
		EventManager.trigger('tilesCleared', [resourcesGained, swapSide, moved]);
		if(wave.chain > 1) {
			EventManager.trigger('chainCombo', [wave.chain]);
		}
		if(wave.gauge > 0) {
			EventManager.trigger('gaugeGain', [wave.gauge]);
		}
	} else {
		EventManager.trigger('tilesSwapped', [lastSwitch == null]);
		State.setIfHigher('CHAIN', wave.chain);
		if(lastSwitch) {
			// Revert the switch
			GameBoard.switchTiles();
		} else if(!Board.movesAvailable(board)) {
			noMoreMoves();
		}
	}
	moved = false;
}

function announceBurst(burst) {
	var at = { row: burst.row, column: burst.column };
	switch(burst.type) {
	case 'lanternPower':
		EventManager.trigger('lanternBurst', [at]);
		break;
	case 'sunPower':
		EventManager.trigger('sunBurst', [at]);
		break;
	case 'explosive':
		EventManager.trigger('hurtDude', [Board.EXPLOSION_DAMAGE]);
		EventManager.trigger('tileExplode', [at]);
		break;
	}
}

function drawEffect(row, column, effectType) {
	EventManager.trigger('drawEffect', [{
		row: row,
		column: column,
		effectType: effectType
	}]);
}

function drawRemoveEffect(row, column, effectType) {
	EventManager.trigger('drawRemoveEffect', [{
		row: row,
		column: column,
		effectType: effectType
	}]);
}

function createEffect(row, column, effectType) {
	if(Board.addEffect(board, { row: row, column: column }, effectType)) {
		drawEffect(row, column, effectType);
	}
}

function releaseAllBinds() {
	Board.releaseAllBinds(board).forEach(function(position) {
		drawRemoveEffect(position.row, position.column, 'shadowBind');
	});
}

// Effects that wear off count down after every move that made a match
function expireEffects(matched) {
	if(matched) {
		Board.expireEffects(board).forEach(function(effect) {
			drawRemoveEffect(effect.row, effect.column, effect.type);
		});
	}
}

export default GameBoard;

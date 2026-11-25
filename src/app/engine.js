import Util from './util.js';
import EventManager from './eventmanager.js';
import Graphics from './graphics/graphics.js';
import Content from './gamecontent.js';
import GameBoard from './gameboard.js';
import GameState from './gamestate.js';
import World from './world.js';
import Loot from './loot.js';
import Magic from './magic.js';
import GameOptions from './gameoptions.js';
import GameAudio from './audio/audio.js';
import Visibility from './visibility.js';
import KeySequencer from './keysequencer.js';
import Difficulty from './graphics/difficulty.js';
import Language from './graphics/language.js';
import Records from './graphics/records.js';
import Story from './story.js';
import Dusk from './graphics/dusk.js';
import Skills from './skills.js';
import Blessings from './blessings.js';
import Plan from './plan.js';
import LongNight from './longnight.js';
import { watchNight } from './effects.js';

var DRAG_THRESHOLD = 30; // in pixels
// What a press is: the mouse going down, or a finger touching
var PRESS = ['mousedown', 'touchstart'];
var MOBILE_RATIO = 16/10; // height/width
var activeTile = null;
var dragging = false;
var dragStart = {x: 0, y: 0};
var loaded = false;
var silent = true;
var started = false;
// Choices on screen that the game waits for
var holds = 0;

function initializeModules(modules, callback) {
	// init all modules passed to me
	var module = null;
	(function initModule() {
		if(module == null) {
			if(modules.length == 0) {
				return callback();
			} else {
				module = modules.shift();
				var args = null;
				if(typeof module.init != 'function' && module.length && module.length == 2) {
					// array was passed
					args = module[1], module = module[0];
				}
				module.init(args);
			}
		}
		if(isReady(module)) {
			module = null;
			initModule();
		} else {
			setTimeout(initModule, 50);
		}
	})();
}

function isIOS() {
	return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
}

function isReady(module) {
	if(typeof module.isReady == 'function'){
		return module.isReady();
	}
	if(module.isReady != null) {
		return module.isReady;
	}
	return true;
}

function canMove() {
	return GameBoard.canMove() && World.canMove() && !Engine.paused;
}

// Tiles are picked up and swapped by cell, { row, column }
function startDrag(cell) {
	if(canMove()) {
		if(activeTile == null) {
			// Select the tile, unless a shade has bound it
			if(!GameBoard.isBound(cell.row, cell.column)) {
				activeTile = cell;
				Graphics.selectTile(cell);
			}
		} else {
			// Either initiate a switch, or deselect
			var active = activeTile;
			activeTile = null;
			Graphics.deselectTile(active);
			if(Math.abs(cell.row - active.row) + Math.abs(cell.column - active.column) == 1 && !GameBoard.isBound(cell.row, cell.column)) {
				GameBoard.switchTiles(
					{row: active.row, col: active.column},
					{row: cell.row, col: cell.column}
				);
			}
		}
	}
}

function endDrag(delta) {
	if(activeTile != null) {
		var dx = delta.x / DRAG_THRESHOLD;
		dx = dx < 0 ? Math.ceil(dx) : Math.floor(dx);
		dx = dx / Math.abs(dx) || 0;
		var dy = delta.y / DRAG_THRESHOLD;
		dy = dy < 0 ? Math.ceil(dy) : Math.floor(dy);
		dy = dy / Math.abs(dy) || 0;
		if(Math.abs(dx) + Math.abs(dy) == 1) {
			var active = activeTile;
			activeTile = null;
			Graphics.deselectTile(active);
			if(active.row + dy >= 0 && active.row + dy < GameBoard.options.rows &&
			   active.column + dx >= 0 && active.column + dx < GameBoard.options.columns &&
			   !GameBoard.isBound(active.row + dy, active.column + dx)) {
				GameBoard.switchTiles(
					{row: active.row, col: active.column},
					{row: active.row + dy, col: active.column + dx}
				);
			}
			return true;
		}
		return false;
	}
}

function startGame(slot) {
	GameState.load(slot);
	EventManager.trigger('gameLoaded');
	EventManager.trigger('refreshBoard');
	EventManager.trigger('launchDude');
	document.body.classList.remove('titleScreen');
	started = true;
}

function importSlot(slotNum, importCode) {
	if(GameState.import(slotNum, importCode)) {
		Graphics.replaceSlot(slotNum, GameState.getSlotInfo(slotNum));
	} else {
		Graphics.rejectImport(slotNum);
	}
}

function isModernBrowser() {
	return ( location.search.indexOf( 'ignorebrowser' ) >= 0 || ( typeof Storage != 'undefined' ) );
}

// While the game is paused, a press anywhere on the page carries on with it
function setPaused(p) {
	Engine.paused = p;
	if(p) {
		['click', 'touchstart'].forEach(function(type) {
			document.body.addEventListener(type, carryOn, { once: true });
		});
	}
}

function carryOn() {
	EventManager.trigger('unpause');
}

// A press the page does nothing else with
function stop(e) {
	e.preventDefault();
	e.stopPropagation();
}

function pointOf(e) {
	return e.changedTouches ? e.changedTouches[0] : e;
}

// The page around the game is there from the start, and listened to once
var listening = false;
function listenToPage() {
	if(listening) {
		return;
	}
	listening = true;
	var test = document.getElementById('test');
	if(test) {
		test.addEventListener('click', function() {
			EventManager.trigger('phaseChange', [!Engine.isNight()]);
		});
	}
	var pauseIcon = document.getElementById('pauseIcon');
	['click', 'touchstart'].forEach(function(type) {
		pauseIcon.addEventListener(type, function(e) {
			if(!Engine.paused) {
				EventManager.trigger('pause');
				stop(e);
			}
		});
	});
	// A press anywhere else closes the spells; the page does nothing else with it,
	// unless it is for typing, a link or a button
	PRESS.forEach(function(type) {
		document.body.addEventListener(type, function(e) {
			EventManager.trigger('toggleMenu');
			var target = e.target;
			if(!(target.tagName == 'TEXTAREA' || target.tagName == 'A' || target.tagName == 'INPUT' ||
					(target.hasAttribute && target.hasAttribute('data-clickable')))) {
				stop(e);
			}
		});
	});
}

// The board: a tile pressed is picked up, or swapped with the one picked up before;
// a tile dragged is swapped with the one it is dragged onto
function listenToBoard(board) {
	PRESS.forEach(function(type) {
		board.addEventListener(type, function(e) {
			if(!(e.target instanceof Element) || e.target.closest('.boardCanvas') == null) {
				return;
			}
			if(!canMove()) {
				// Tapping the board while a chain plays out fast-forwards it
				GameBoard.hurry();
			}
			if(!dragging) {
				var point = pointOf(e);
				var cell = Graphics.tileAt(point.clientX, point.clientY);
				if(cell) {
					dragStart.x = point.clientX;
					dragStart.y = point.clientY;
					dragging = true;
					startDrag(cell);
				}
			}
			EventManager.trigger('toggleMenu');
			stop(e);
		});
	});
	['mouseup', 'touchend'].forEach(function(type) {
		board.addEventListener(type, function(e) {
			dragging = false;
			stop(e);
		});
	});
	['mousemove', 'touchmove'].forEach(function(type) {
		board.addEventListener(type, function(e) {
			if(dragging) {
				var point = pointOf(e);
				if(endDrag({
					x: point.clientX - dragStart.x,
					y: point.clientY - dragStart.y
				})) {
					dragging = false;
				}
			}
			stop(e);
		});
	});
}

// The world: a building's bars of materials, or a building lifted for its upgrade,
// pressed, is seen to first
function listenToWorld(world) {
	PRESS.forEach(function(type) {
		world.addEventListener(type, function(e) {
			if(e.target instanceof Element && e.target.closest('.villageCanvas') != null) {
				var point = pointOf(e);
				var building = Graphics.buildingAt(point.clientX, point.clientY);
				if(building) {
					EventManager.trigger('prioritizeBuilding', [building]);
				}
			}
			EventManager.trigger('toggleMenu');
			stop(e);
		});
	});
}

var Engine = {
	options: {},
	init: function(opts) {
		Util.extend(this.options, opts);
		holds = 0;

		if(!isModernBrowser()) {
			window.location = 'browserWarning.html';
		}
	
		listenToPage();

		var gOptions = null;
		// Change the aspect ratio of the gameboard on mobile devices with 16:10 or :9 ratio
		if (window.screen.height / window.screen.width >= MOBILE_RATIO) {
			gOptions = {
				rows: 8,
				columns: 7,
				mobile: true
			};
		}
		
		// The music and sounds, unless the page asks for none
		var audio = null;
		if(window.location.search.indexOf('nomusic') >= 0) {
			audio = [GameAudio, { nomusic: true }];
			silent = false;
		} else if(window.location.search.indexOf('silent') < 0) {
			audio = GameAudio;
			silent = false;
		}

		// What the board asks of the game, and what the effects of items, spells and
		// skills ask: whether the game is paused, whether it is night, whether the
		// Eclipse is out
		var board = Util.extend({
			paused: function() {
				return Engine.paused;
			},
			night: function() {
				return World.isNight();
			},
			eclipseOut: function() {
				return World.bossOut('eclipse');
			}
		}, gOptions);
		watchNight(function() {
			return World.isNight();
		});

		var modules = [EventManager,
		                Visibility,
						[GameBoard, board],
						[Graphics, {
							ios: isIOS(),
							silent: silent,
							// Sparks fly from the keeper's blows
							keeper: function() {
								return World.getDude();
							}
						}],
						World,
						Loot,
						Magic,
						KeySequencer];
		if(audio != null) {
			modules.push(audio);
		}
		
		modules.push(Difficulty);
		modules.push(Language);
		modules.push(Records);
		modules.push(Story);
		modules.push(Dusk);
		modules.push(Skills);
		modules.push(Blessings);
		modules.push(Plan);
		modules.push(LongNight);
		
		// Start the game
		GameOptions.load();
		initializeModules(modules, function() {
			if(loaded) {
				startGame();
			} else {
				loaded = true;
				Graphics.enablePlayButton();
			}
		});
		
		EventManager.bind("prestige", function() {
			GameState.count('PRESTIGE', 1);
			GameState.doPrestige();
			Engine.init();
		});
		
		EventManager.bind('slotChosen', startGame);
		// An item pressed is used, unless the world is busy
		EventManager.bind('itemPressed', function(item) {
			if(World.canMove()) {
				EventManager.trigger('toggleMenu');
				Loot.useItem(item);
			}
		});
		EventManager.bind('deleteSlot', GameState.deleteSlot);
		EventManager.bind('importSlot', importSlot);
		EventManager.bind('pause', setPaused.bind(this, true));
		// Every open choice holds the game; it moves again once all of them are let go
		EventManager.bind('hold', function() {
			holds++;
			Engine.paused = true;
		});
		EventManager.bind('letGo', function() {
			holds = Math.max(0, holds - 1);
			if(holds == 0) {
				EventManager.trigger('unpause');
			}
		});
		EventManager.bind('unpause', function() {
			if(holds > 0) {
				return;
			}
			setPaused(false);
			EventManager.trigger('afterUnpaused');
		});
		
		// The board and the world are made anew as the game starts
		listenToBoard(Graphics.board());
		listenToWorld(Graphics.world());
	},

	isNight: function() {
		return World.isNight();
	},
	

	isStarted: function() {
		return started;
	},
	
	_debug: function(text) {
		var debug = document.getElementById('debug');
		if(debug) {
			debug.textContent = text;
		}
	}
};

export default Engine;

import $ from '../vendor/jquery.js';
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
import { register } from './modules.js';

var DRAG_THRESHOLD = 30; // in pixels
var MOBILE_RATIO = 16/10; // height/width
var activeTile = null;
var dragging = false;
var dragStart = {x: 0, y: 0};
var graphicsCallback = null;
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
	return graphicsCallback == null && GameBoard.canMove() && World.canMove() && !Engine.paused;
}

function startDrag(tile) {
	if(canMove()) {
		if(activeTile == null) {
			// Select the tile, unless a shade has bound it
			if(!GameBoard.isBound(tile.options.row, tile.options.column)) {
				activeTile = tile;
				Graphics.selectTile(tile);
			}
		} else {
			// Either initiate a switch, or deselect
			var active = activeTile;
			activeTile = null;
			Graphics.deselectTile(active);
			if(tile.isAdjacent(active) && !GameBoard.isBound(tile.options.row, tile.options.column)) {
				GameBoard.switchTiles(
					{row: active.options.row, col: active.options.column}, 
					{row: tile.options.row, col: tile.options.column}
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
			if(active.options.row + dy >= 0 && active.options.row + dy < GameBoard.options.rows &&
			   active.options.column + dx >= 0 && active.options.column + dx < GameBoard.options.columns &&
			   !GameBoard.isBound(active.options.row + dy, active.options.column + dx)) {
				GameBoard.switchTiles(
					{row: active.options.row, col: active.options.column}, 
					{row: active.options.row + dy, col: active.options.column + dx}
				);
			}
			return true;
		}
		return false;
	}
}

function handleGraphicsComplete() {
	if(typeof graphicsCallback == 'function') {
		var cb = graphicsCallback;
		graphicsCallback = null;
		cb();
	}
}

function startGame(slot) {
	GameState.load(slot);
	EventManager.bind('graphicsActionComplete', handleGraphicsComplete);
	EventManager.trigger('gameLoaded');
	EventManager.trigger('refreshBoard');
	EventManager.trigger('launchDude');
	$('body').removeClass('titleScreen');
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

function setPaused(p) {
	Engine.paused = p;
	if(p) {
		Graphics.get('body').one('click touchstart', function() {
			EventManager.trigger('unpause');
		});
	}
}

var Engine = {
	options: {},
	init: function(opts) {
		$.extend(this.options, opts);
		holds = 0;

		if(!isModernBrowser()) {
			window.location = 'browserWarning.html';
		}
	
		$('#test').off().click(function() { 
			EventManager.trigger('phaseChange', [!Engine.isNight()]);
		});
		
		$('.menuBtn').off().on("click touchstart", function() {
			var menuBar = $('.menuBar');
			menuBar.toggleClass('open').addClass('closing');
			setTimeout(function() {
				menuBar.removeClass('closing');
			}, 200);
			EventManager.trigger('click', ['menubutton']);
		});

		$('#pauseIcon').off().on('click touchstart', function() {
			if(!Engine.paused) {
				EventManager.trigger('pause');
				return false;
			}
		});
		
		var gOptions = null;
		// Change the aspect ratio of the gameboard on mobile devices with 16:10 or :9 ratio
		if (window.screen.height / window.screen.width >= MOBILE_RATIO) {
			gOptions = {
				rows: 8,
				columns: 7,
				mobile: true
			};
		}
		
		var modules = [EventManager,
		                Visibility,
						[GameBoard, gOptions],
						[Graphics, { ios: isIOS() }],
						World,
						Loot,
						Magic,
						KeySequencer];
		if(window.location.search.indexOf('nomusic') >= 0) {
			modules.push([GameAudio, { nomusic: true }]);
			silent = false;
		} else if(window.location.search.indexOf('silent') < 0) {
			modules.push(GameAudio);
			silent = false;
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
		
		Graphics.attachHandler("GameBoard", "mousedown touchstart", '.tile', function(e) {
			if(!canMove()) {
				// Tapping the board while a chain plays out fast-forwards it
				GameBoard.hurry();
			}
			if(!dragging) {
				// Handle wacky touch event objects
				if(e.originalEvent.changedTouches) {
					e = e.originalEvent.changedTouches[0];
				}
				dragStart.x = e.clientX;
				dragStart.y = e.clientY;
				dragging = true;
				var tile = $.data(this, "tile");
				startDrag(tile);
			}
			EventManager.trigger('toggleMenu');
			return false;
		});
		Graphics.attachHandler("GameBoard", "mouseup touchend", function(e) {
			dragging = false;
			return false;
		});
		Graphics.attachHandler("GameBoard", "mousemove touchmove", function(e) {
			if(dragging) {
				// Handle wacky touch event objects
				if(e.originalEvent.changedTouches) {
					e = e.originalEvent.changedTouches[0];
				}
				if(endDrag({ 
					x: e.clientX - dragStart.x,
					y: e.clientY - dragStart.y
				})) {
					dragging = false;
				}
			}
			return false;
		});
		
		Graphics.attachHandler("GameBoard", "mousedown touchstart", ".inventory .button", function(e) {
			if(World.canMove()) {
				// Handle wacky touch event objects
				if(e.originalEvent.changedTouches) {
					e = e.originalEvent.changedTouches[0];
				}
				var loot = $(e.target).closest('.button').data('lootName');
				EventManager.trigger('toggleMenu');
				Loot.useItem(loot);
				EventManager.trigger('click', [loot]);
			}
			return false;
		});
		Graphics.attachHandler("GameBoard", "mousedown touchstart", ".magic .button", function(e) {
			// Handle wacky touch event objects
			if(e.originalEvent.changedTouches) {
				e = e.originalEvent.changedTouches[0];
			}
			EventManager.trigger('magicClick', [$(e.target)]);
			EventManager.trigger('click', ['magic']);
			return false;
		});
		$('body').off().on('mousedown touchstart', function(e) {
			EventManager.trigger('toggleMenu');
			return e.target.tagName == 'TEXTAREA' || e.target.tagName == 'A' || e.target.tagName == 'INPUT' || e.target.hasAttribute('data-clickable');
		});
		Graphics.attachHandler("World", "mousedown touchstart", '.resourceBars', function(e) {
			// Handle wacky touch event objects
			if(e.originalEvent.changedTouches) {
				e = e.originalEvent.changedTouches[0];
			}
			EventManager.trigger('prioritizeBuilding', [$(e.target).closest('.resourceBars').data('building')]);
			EventManager.trigger('click', ['building']);
		});
		Graphics.attachHandler("World", "mousedown touchstart", '.building.upgrading', function(e) {
			// Handle wacky touch event objects
			if(e.originalEvent.changedTouches) {
				e = e.originalEvent.changedTouches[0];
			}
			EventManager.trigger('prioritizeBuilding', [$(e.target).closest('.building').data('upgrade')]);
			EventManager.trigger('click', ['building']);
		});
		Graphics.attachHandler("World", "mousedown touchstart", function(e) {
			// Handle wacky touch event objects
			if(e.originalEvent.changedTouches) {
				e = e.originalEvent.changedTouches[0];
			}
			EventManager.trigger('toggleMenu');
			return false;
		});
	},
	
	setGraphicsCallback: function(cb) {
		if(graphicsCallback != null) throw "Already waiting on graphics!";
		graphicsCallback = cb;
	},
	
	isNight: function() {
		return World.isNight();
	},
	
	isSilent: function() {
		return silent;
	},

	isStarted: function() {
		return started;
	},
	
	_debug: function(text) {
		$('#debug').text(text);
	}
};

register('engine', Engine);
export default Engine;

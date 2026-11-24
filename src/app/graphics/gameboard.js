import $ from '../../vendor/jquery.js';
import E from '../eventmanager.js';
import GameBoard from '../gameboard.js';
import Content from '../gamecontent.js';
import Graphics from './graphics.js';
import WorldGraphics from './world.js';
import { BoardView } from '../../render/board.ts';
import { EffectsView } from '../../render/effects.ts';

// The board on screen. The tiles are drawn on a canvas (src/render/board.ts); this
// module turns the board's draw requests into the view's animations, with the
// timing the rest of the game waits on, and keeps the grid of tiles as drawn. The
// resources flying off the board, and the bursts and pop-ups over it, are HTML.

var G = null;
var _el = null;
var view = null;
var effects = null;
// The world sits this far above the board, and is this tall (see .world)
var WORLD_TOP = 112;
var WORLD_HEIGHT = 110;
// A long chain, a powder keg and the power tiles going off shake the board
var LONG_CHAIN = 8;
var tiles = [];
var CELL = 60;
var BOARD_PAD = 2;
var FILL_DELAY = 100;
// The board's classes as last read: each kind of tile's level, and the dragon fight
var boardClasses = null;
var LEVEL_CLASS = /^(grain|wood|stone|clay|cloth|mana|lantern)(\d+)$/;

// Long chains speed up as they go, and tapping the board hurries the rest along
function paceOf(opts) {
	if(opts.hurried || opts.chain >= 13) {
		return 0.25;
	} else if(opts.chain >= 7) {
		return 0.5;
	} else if(opts.chain >= 4) {
		return 0.75;
	}
	return 1;
}

function el() {
	if (_el == null) {
		clearBoard();
		_el = createBoard(GameBoard.options.rows, GameBoard.options.columns);
		_el.addClass('hidden');
		G.addToGame(_el);
	}
	return _el;
}

function setTile(row, col, tile) {
	tiles[row] = tiles[row] || [];
	tiles[row][col] = tile;
}

function getTile(row, col) {
	return tiles[row] ? tiles[row][col] : null;
}

function clearBoard() {
	$('.gameBoard').remove();
}

function createBoard(rows, cols) {
	var el = G.make('gameBoard litBorder');
	if(GameBoard.options.mobile) {
		$('body').addClass('portrait');
	}
	// Tiles are bigger on phones
	var portrait = $('body').hasClass('portrait');
	CELL = portrait ? 70 : 60;
	el.width(CELL * cols);
	el.height(CELL * rows);
	var tileContainer = G.make('tileContainer').attr('id', 'tileContainer').appendTo(el);
	var canvas = G.make('boardCanvas', 'canvas').appendTo(tileContainer);
	if(view != null) {
		view.stop();
	}
	view = new BoardView(canvas[0], { rows: rows, columns: cols, cell: CELL, pad: BOARD_PAD, scale: portrait ? 1.15 : 1 });
	view.beforeDraw = followPage;
	view.setNight($('body').hasClass('night'), false);
	view.start();
	makeEffects(el, cols, rows);
	// For debugging from the browser console
	window.boardView = function() {
		return view;
	};
	return el;
}

// Effects over the world and the board, on a canvas in front of both; the whole
// board moves while it shakes
function makeEffects(board, cols, rows) {
	var canvas = G.make('effectsCanvas', 'canvas').appendTo(board);
	if(effects != null) {
		effects.stop();
	}
	effects = new EffectsView(canvas[0], {
		width: CELL * cols + 2 * BOARD_PAD,
		world: { height: WORLD_HEIGHT },
		board: { top: WORLD_TOP, rows: rows, columns: cols, cell: CELL, pad: BOARD_PAD }
	});
	effects.onShake = function(dx, dy) {
		board[0].style.translate = dx || dy ? dx + 'px ' + dy + 'px' : '';
	};
	// Night falls on the body; the keeper's lantern and the village's windows light it
	var page = document.body.classList;
	effects.setNight(page.contains('night'), false);
	effects.beforeDraw = function() {
		effects.setNight(page.contains('night'));
		var lights = WorldGraphics.lights();
		effects.keeper = lights ? lights.keeper : null;
		effects.windows = lights ? lights.windows : [];
	};
	effects.start();
}

// The view follows the page: night falls on the body, and the board's classes say
// each kind of tile's level and whether the dragon has changed them (see changeTiles)
function followPage() {
	view.setNight(document.body.classList.contains('night'));
	var classes = _el ? _el[0].className : '';
	if(classes !== boardClasses) {
		boardClasses = classes;
		var levels = {};
		classes.split(/\s+/).forEach(function(name) {
			var match = LEVEL_CLASS.exec(name);
			if(match) {
				levels[match[1]] = Math.max(levels[match[1]] || 1, Number(match[2]));
			}
		});
		view.levels = levels;
		effects.levels = levels;
		view.dragonFight = /(^|\s)dragonFight(\s|$)/.test(classes);
	}
}

function drawSwapTiles(opts) {
	var t1 = getTile(opts.pos1.row, opts.pos1.col);
	var t2 = getTile(opts.pos2.row, opts.pos2.col);
	setTile(opts.pos1.row, opts.pos1.col, t2);
	setTile(opts.pos2.row, opts.pos2.col, t1);
	view.slide(t1, opts.pos2.row, opts.pos2.col, 0, 200);
	view.slide(t2, opts.pos1.row, opts.pos1.col, 0, 200);
	return 200;
}

function drawBoardClear() {
	for(var row in tiles) {
		for(var col in tiles[row]) {
			removeTile(row, col);
		}
	}
	return 300;
}

// The new tiles drop in one by one, from the far corner
function drawFillBoard(tileString) {
	var rows = GameBoard.options.rows, cols = GameBoard.options.columns;
	var mTime = (rows + cols) * FILL_DELAY;
	tileString.split(GameBoard.SEP).slice(0, cols).forEach(function(column, col) {
		column.split('').forEach(function(tileChar, row) {
			var tile = newTile(row, col, tileChar);
			var delay = 200 + mTime - ((row + (cols - col)) * FILL_DELAY);
			view.slide(tile, row, col, delay, 200);
			setTimeout(function() {
				E.trigger('tileDrop');
			}, delay + 100);
		});
	});
	return mTime + 200;
}

var effectPool = [];
function getEffectEl(pos, type) {
	var e;
	if(effectPool.length == 0) {
		e = G.make('resourceEffect').appendTo(el());
	} else {
		e = effectPool.pop();
	}
	var left = (pos.col * CELL) + (CELL / 2),
		top = (pos.row * CELL) + (CELL / 2);
	e.addClass(type.className).css({
		'transform': 'translate3d(' + left + 'px, ' + top + 'px, 0px) scale(1)',
		'-webkit-transform': 'translate3d(' + left + 'px, ' + top + 'px, 0px) scale(1)',
		'-moz-transform': 'translate3d(' + left + 'px, ' + top + 'px, 0px) scale(1)',
		'-ms-transform': 'translate3d(' + left + 'px, ' + top + 'px, 0px) scale(1)',
		'-o-transform': 'translate3d(' + left + 'px, ' + top + 'px, 0px) scale(1)'
	}).removeClass('pooled');
	return e;
}

function removeEffectEl(el) {
	el.attr('class', 'resourceEffect pooled');
	effectPool.push(el);
}

function drawMatchEffect(pos, type, isNight, side) {
	if(type != null && GameBoard.shouldDrawResourceEffect(type)) {
		// Create the effect at the tile position
		var e = getEffectEl(pos, type);
		// Move it to the destination
		e.css('left');
		var dest = type.effectDest[isNight ? 'night' : 'day'];
		if(dest == 'side') {
			dest = [ side == 'left' ? 0 : G.worldWidth(), -20];
		} else if(dest == 'sword') {
			dest = [-20, 28 * G.numHearts() + 14];
		}
		e.css({
			'transform': 'translate3d(' + dest[0] + 'px, ' + dest[1] + 'px, 0px) scale(0.2)',
			'-webkit-transform': 'translate3d(' + dest[0] + 'px, ' + dest[1] + 'px, 0px) scale(0.2)',
			'-moz-transform': 'translate3d(' + dest[0] + 'px, ' + dest[1] + 'px, 0px) scale(0.2)',
			'-ms-transform': 'translate3d(' + dest[0] + 'px, ' + dest[1] + 'px, 0px) scale(0.2)',
			'-o-transform': 'translate3d(' + dest[0] + 'px, ' + dest[1] + 'px, 0px) scale(0.2)'
		});
		setTimeout(function() {
			removeEffectEl(e);
		}, 700);
	}
}

// Matched tiles fade away, the tiles above them drop into their places, and new
// tiles drop in from above the board
function drawMatch(opts) {
	var pace = paceOf(opts);
	var dropping = [];
	// Fewer bits fly off the tiles of a chain played out fast
	var bits = pace <= 0.5 ? 2 : 5;
	(opts.removed || []).forEach(function(removed) {
		var pos = removed.position;
		removeTile(pos.row, pos.col);
		drawMatchEffect(pos, removed.type, opts.isNight, opts.side);
		if(removed.type) {
			effects.tileBits(pos.row, pos.col, removed.type.className, bits);
		}
		// Each tile above it drops a cell
		for(var r = pos.row - 1; r >= 0; r--) {
			var t = getTile(r, pos.col);
			if(t) {
				t.row++;
				dropping.push(t);
			}
		}
	});
	(opts.added || []).forEach(function(added) {
		dropping.push(newTile(added.row, added.col, added.char));
	});
	// A matched tile can drop before its own turn to go comes; it stays gone
	var moved = [];
	dropping.forEach(function(t) {
		if(moved.indexOf(t) < 0 && t.fade == null) {
			moved.push(t);
			setTile(t.row, t.column, t);
			view.slide(t, t.row, t.column, 200 * pace, 200 * pace);
		}
	});

	if(opts.chain >= LONG_CHAIN && !opts.hurried) {
		effects.shake(2, 250);
	}
	setTimeout(function() {
		E.trigger('tileDrop');
	}, 300 * pace);
	return 400 * pace;
}

// A new tile waits above the board, a board's height up, to drop into its cell
function newTile(row, col, tileChar) {
	var tile = view.add(Content.getResourceType(tileChar).className, row, col, row - GameBoard.options.rows);
	setTile(row, col, tile);
	return tile;
}

function removeTile(row, col) {
	var t = getTile(row, col);
	setTile(row, col, null);
	if(t) {
		view.fade(t, 200);
	}
}

function drawTileEffect(options) {
	var tile = getTile(options.row, options.column);
	if(tile) {
		view.setEffect(tile, options.effectType, true);
	}
}

function removeTileEffect(options) {
	var tile = getTile(options.row, options.column);
	if(tile) {
		view.setEffect(tile, options.effectType, false);
	}
}

function explode(options) {
	view.explode({ row: options.row, column: options.column });
	effects.shake(5, 400);
}

export default {
	init: function() {
		G = Graphics;
		tiles.length = 0;
		_el = null;
		boardClasses = null;
		el();

		effectPool.length = 0;
		E.bind('drawEffect', drawTileEffect);
		E.bind('drawRemoveEffect', removeTileEffect);
		E.bind('tileExplode', explode);
		E.bind('gameLoaded', function() {
			el().removeClass('hidden');
		});
	},

	el: el,

	attachHandler: function(event, element, handler) {
		if(element) {
			el().on(event, element, handler);
		} else {
			el().on(event, handler);
		}
	},

	handleDrawRequest: function(requestString, options) {
		switch(requestString.toLowerCase()) {
			case 'clear':
				return drawBoardClear(options);
			case 'fill':
				return drawFillBoard(options);
			case 'swap':
				return drawSwapTiles(options);
			case 'match':
				return drawMatch(options);
		}
	},

	// The cell under a point on the screen, as { row, column }, or null
	cellAt: function(clientX, clientY) {
		return view.cellAtClient(clientX, clientY);
	},

	cellSize: function() {
		return CELL;
	},

	// Effects over the world and the board, and the board shaking (src/render/effects.ts)
	effects: function() {
		return effects;
	},

	// The level each kind of tile has reached, as the board's classes say
	levels: function() {
		return view ? view.levels : {};
	},

	// Marks the tile in a cell as picked up; null puts it down
	select: function(cell) {
		view.select(cell ? getTile(cell.row, cell.column) : null);
	},

	// Tiles of these kinds fade out while their pictures change, then back in
	hideKinds: function(kinds) {
		view.hideKinds(kinds);
	},

	showKinds: function(kinds) {
		view.showKinds(kinds);
	}
};

import $ from '../../vendor/jquery.js';
import EventManager from '../eventmanager.js';
import TextStore from '../textStore.js';
import Options from '../gameoptions.js';
import BoardGraphics from './gameboard.js';
import WorldGraphics from './world.js';
import LootGraphics from './loot.js';
import MagicGraphics from './magic.js';
import AudioGraphics from './audio.js';
import Sprites from './sprites.js';
import { register, getModule } from '../modules.js';
import { StatusBar, heartsFor } from '../../ui/status.ts';
import { Notices } from '../../ui/notices.ts';
import State from '../gamestate.js';
import GameBoard from '../gameboard.js';

var MIN_SCREEN_WIDTH = 600, MIN_SCREEN_HEIGHT = 650, PORTRAIT_HEIGHT = 725;

var textStore;
var _ww = null, _wh = null;
var styleSheet = null;
var currentScale = null;
// The keeper's status beside the board, and the words that come up over it (src/ui)
var status = null;
var notices = null;
var imageLoaded = false;
var isDragon = false;

function handleDrawRequest(requestString, options) {
	var moduleString = requestString.substring(0, requestString.indexOf('.'));
	requestString = requestString.substring(requestString.indexOf('.') + 1);
	
	var module = null;
	switch(moduleString.toLowerCase()) {
		case 'board':
			module = BoardGraphics;
			break;
		case 'world':
			module = WorldGraphics;
			break;
		case 'loot':
			module = LootGraphics;
			break;
		case 'magic':
			module = MagicGraphics;
			break;
		case 'audio':
			module = AudioGraphics;
			break;
	}
	
	var time = 0;
	if(module != null && module.handleDrawRequest) {
		time = module.handleDrawRequest(requestString, options);
	}
	
	setTimeout(function() {
		EventManager.trigger('graphicsActionComplete');
	}, time);
}

// The sun and moon take this long to move, and rise from the far left of the sky
var CELESTIAL_MOVE = 500;
var SKY_EDGE = 15;
// A building takes this long to rise; the buildings rising now, with their timers
var BUILD_TIME = 5000;
var BUILDING_WIDTH = 60;
// How far in front of the keeper their blows land
var BLOW_REACH = 14;
var raising = new Map();
// The dragon shows up this high in the sky, and the ground shakes this hard as it roars
var DRAGON_FLIES_FROM = 200;
var ROAR_SHAKE = 8;

// Sparks fly where the keeper's blow lands, in front of them
function keeperHit() {
	var keeper = getModule('world').getDude();
	if(keeper) {
		Graphics.effects().sparks(keeper.p() + (keeper.facing == 'left' ? -BLOW_REACH : BLOW_REACH));
	}
}

// Dust rises along the foot of a building that has just stood up
function buildingStands(building) {
	Graphics.effects().dust(building.p(), BUILDING_WIDTH);
}

// Tiles of these kinds fade out, change their pictures (the board's classes say
// each kind's level, and whether the dragon has changed them), and fade back in
function changeTiles(tileTypes, classToAdd, classToRemove) {
	BoardGraphics.hideKinds(tileTypes);
	setTimeout(function() {
		BoardGraphics.el().removeClass(classToRemove).addClass(classToAdd);
		BoardGraphics.showKinds(tileTypes);
	}, 300);
}

var getStats = (function() {
	var _stats = null;
	return function(counts) {
		var list;
		if(_stats == null) {
			_stats = Graphics.make().attr('id', 'endGame');
			_stats.append($('<h2>').text(textStore.get('CLEAR')));
			_stats.append($('<ul>').addClass('menu')
				.append($('<li>').text(textStore.get('CONTINUE')).on('click touchstart', continueGame))
				.append($('<li>').text(textStore.get('NEWGAMEPLUS')).on('click touchstart', newGamePlus)));
			list = $('<ul>').addClass('counts').appendTo(_stats);
			Graphics.get('body').append(_stats);
			_stats.css('left');
		} else {
			list = $('ul.list', _stats);
			if(counts) {
				list.empty();
			}
		}
		
		if(counts) {
			for(var key in counts) {
				list.append($('<li>')
					.append($('<span>').text(textStore.get(key) || 0))
					.append($('<span>').text(counts[key]))
				);
			}
		}
		
		return _stats;
	};
})();

function gameOver(counts) {
	Graphics.get('body').addClass('bigExplosion');
	setTimeout(function() {
		getStats(counts).addClass('down');
	}, 2000);
}

function continueGame() {
	EventManager.trigger('phaseChange', [false]);
	getStats().removeClass('down');
	BoardGraphics.el().removeClass('dragonFight');
	var b = Graphics.get('body');
	setTimeout(function() {
		b.addClass('fadeOut');
	}, 1400);
	setTimeout(function() {
		b.removeClass('bigExplosion fadeOut');
	}, 2800);
}

function newGamePlus() {
	getStats().removeClass('down');
	BoardGraphics.el().removeClass('dragonFight');
	var b = Graphics.get('body');
	b.removeClass('night');
	setTimeout(function() {
		b.addClass('fadeOut');
		EventManager.trigger('prestige');
	}, 1400);
	setTimeout(function() {
		b.removeClass('bigExplosion fadeOut');
	}, 2800);
}

function dropBlock(block, building) {
	Graphics.updateCosts(building);
}

function drawSlot(slotInfo, slotIndex) {
	var slot = Graphics.make('saveSlot').data('slotIndex', slotIndex);
	var buttons = [];
	var slotSide = Graphics.make('slotSide').appendTo(slot);
	if(slotInfo === 'empty') {
		slot.addClass('empty');
		slotSide.text(Graphics.getText('NEWGAME'));
		buttons.push({
			className: 'import',
			text: 'IMPORT',
			click: drawImport.bind(slot, slot)
		});
	} else { 
		var heartInfo = heartsFor(slotInfo.maxHealth);
		for(var heartNum = 0; heartNum < heartInfo.total; heartNum++) {
			Graphics.make('full ' + (heartNum < heartInfo.big ? 'bigheart' : 'heart'))
				.append(Graphics.make('mask'))
				.appendTo(slotSide);
		}
		buttons = buttons.concat([
			{
				className: 'export',
				text: 'EXPORT',
				click: drawExport.bind(slot, slot)
			}, {
				className: 'delete',
				text: 'DELETE',
				click: drawDelete.bind(slot, slot)
			}
		]);
		var day = Graphics.make('day').text(Graphics.getText('DAY_N', slotInfo.day));
		if(slotInfo.prestiged) {
			day.prepend(Graphics.make('star'));
		}
		slotSide.append(day);
	}
	slot.append(Graphics.make('infoSide').click(function() {return false;}));
	drawSlotButtons(slotSide, buttons);
	
	slot.on("click touchstart", function(e) {
		if(e.target.tagName != 'TEXTAREA') {
			getModule('audio/audio').play('Click');
			EventManager.trigger('slotChosen', [slotIndex]);
			$('#loadingScreen').addClass('hidden');
			setTimeout(function() {
				$('#loadingScreen').remove();
			}, 1000);
		}
	});
	
	return slot;
}

function drawSlotButtons(slot, buttons) {
	var buttonList = Graphics.make('buttons', 'ul');
	for(var i in buttons) {
		var buttonInfo = buttons[i];
		buttonList.append(Graphics.make(buttonInfo.className, 'li')
			.on('click touchstart', buttonInfo.click).attr('title', Graphics.getText(buttonInfo.text)));
	}
	buttonList.appendTo(slot);
}

function drawImport(slot) {
	EventManager.trigger('click', ['import']);
	slot.addClass('bigView flipped');
	var infoSide = slot.find('.infoSide');
	infoSide.append(Graphics.make('labelText').text(Graphics.getText('IMPORT_CODE')));
	infoSide.append(Graphics.make('exportCode', 'textarea'));
	drawSlotButtons(infoSide, [{
		className: 'confirm',
		text: 'CONFIRM',
		click: doImport.bind(slot, slot)
	}, {
		className: 'cancel',
		text: 'CANCEL',
		click: cancelSlotAction.bind(slot, slot)
	}]);
	return false;
}

function drawExport(slot) {
	EventManager.trigger('click', ['export']);
	slot.addClass('bigView flipped');
	var infoSide = slot.find('.infoSide');
	infoSide.append(Graphics.make('labelText').text(Graphics.getText('EXPORT_CODE')));
	infoSide.append(Graphics.make('exportCode', 'textarea').text(
		State.getExportCode(slot.data('slotIndex'))
	).attr('readonly', true));
	drawSlotButtons(infoSide, [{
		className: 'confirm',
		text: 'CONFIRM',
		click: cancelSlotAction.bind(slot, slot)
	}]);
	return false;
}

function drawDelete(slot) {
	EventManager.trigger('click', ['delete']);
	slot.addClass('confirmDelete flipped');
	var infoSide = slot.find('.infoSide');
	infoSide.append(Graphics.make('confirmText').text(Graphics.getText('ARE_YOU_SURE')));
	drawSlotButtons(infoSide, [{
		className: 'confirm',
		text: 'CONFIRM',
		click: doDelete.bind(slot, slot)
	}, {
		className: 'cancel',
		text: 'CANCEL',
		click: cancelSlotAction.bind(slot, slot)
	}]);
	return false;
}

function doDelete(slot) {
	var slotIndex = slot.data('slotIndex');
	EventManager.trigger('deleteSlot', [slotIndex]);
	Graphics.get('.saveSlot:nth-child(' + (slotIndex + 1) + ')').before(drawSlot('empty', slotIndex));
	slot.remove();
	return false;
}

function doImport(slot) {
	var slotIndex = slot.data('slotIndex');
	var importCode = slot.find('textarea').val();
	EventManager.trigger('importSlot', [slotIndex, importCode]);
	return false;
}

function cancelSlotAction(slot) {
	var wasEmpty = slot.hasClass('empty');
	slot.removeClass('flipped');
	setTimeout(function() {
		slot.find('.infoSide').empty();
		slot.attr('class', 'saveSlot' + (wasEmpty ? ' empty' : ''));
	}, 500);
	return false;
}

var scaleSheet = null;
function scaleToViewport() {
	var widthScale = document.documentElement.clientWidth / MIN_SCREEN_WIDTH,
		heightScale = document.documentElement.clientHeight /
			(GameBoard.options.mobile ? PORTRAIT_HEIGHT : MIN_SCREEN_HEIGHT);

	if(!scaleSheet) {
		scaleSheet = newStylesheet();
	}

	var minScale = widthScale  < heightScale ? widthScale : heightScale;
	if(minScale != currentScale && minScale < 1) {
		currentScale = minScale;
		scaleSheet.cssRules.length > 0 && scaleSheet.deleteRule(0);
		Graphics.addStyleRule('#loadingScreen, #gameContainer', 
			'transform-origin: 50% 0 0;' +
			'-webkit-transform-origin: 50% 0 0;' +
			'-moz-transform-origin: 50% 0 0;' +
			'-ms-transform-origin: 50% 0 0;' +
			'-o-transform-origin: 50% 0 0;' +
			'transform: scale(' + minScale +');' +
			'-webkit-transform: scale(' + minScale +');' +
			'-moz-transform: scale(' + minScale +');' +
			'-ms-transform: scale(' + minScale +');' +
			'-o-transform: scale(' + minScale +');',
			scaleSheet
		);
	} else if(minScale != currentScale && Graphics.isScaled()) {
		currentScale = null;
		scaleSheet.cssRules.length > 0 && scaleSheet.deleteRule(0);
	}
}

function initStylesheet() {
	var style = $('#styleSheet');
	if(style.length > 0) {
		$(style).remove();
	}
	styleSheet = newStylesheet('styleSheet');
}

function newStylesheet(id){
	var style = document.createElement('style');
	if(id) {
		style.id = id;
	}
	style.appendChild(document.createTextNode("")); // Stupid Webkit
	document.head.appendChild(style);
	return style.sheet;
}

function activateHyperspace() {
	$('body').addClass('hyperspace');
	setTimeout(function() {
		$('body').removeClass('hyperspace');
	}, 1000);
}

function setPaused(p) {
	$('body').toggleClass('paused', p);
}

var Graphics = {
	init: function(opts) {
		isDragon = false;
		$('body').removeClass('night').toggleClass('ios', opts.ios);

		textStore = new TextStore(Options.get('language') || TextStore.detectLocale());
		$('html').attr('lang', textStore.localeName == 'zh-TW' ? 'zh-Hant-TW' : 'en');

		initStylesheet();
		scaleToViewport();
		$(window).off('resize').on('resize', scaleToViewport);
		
		EventManager.bind('draw', handleDrawRequest);
		
		EventManager.bind('pause', setPaused.bind(this, true));
		EventManager.bind('unpause', setPaused.bind(this, false));
		EventManager.bind('monsterKilled', this.monsterKilled);
		EventManager.bind('sharpHit', keeperHit);
		EventManager.bind('bluntHit', keeperHit);
		EventManager.bind('buildingComplete', buildingStands);
		EventManager.bind('healthChanged', this.updateHealthBar);
		EventManager.bind('dayBreak', this.handleDayBreak);
		EventManager.bind('gameOver', gameOver);
		EventManager.bind('blockDown', dropBlock);
		EventManager.bind('keySequenceComplete', activateHyperspace);
		EventManager.bind('longLoad', function() {
			Graphics.get('#loadingScreen').append(
				Graphics.make('longload').text(Graphics.getText('LONG_LOAD')).append
				(
					Graphics.make('nomusic', 'a')
						.text(Graphics.getText('NO_MUSIC'))
						.attr('href', window.location + (window.location.search.length > 0 ? '&' : '?') + 'nomusic')
				)
			);
		});
		
		BoardGraphics.init();
		WorldGraphics.init();
		status = new StatusBar(BoardGraphics.el()[0], WorldGraphics.element());
		notices = new Notices(WorldGraphics.element(), BoardGraphics.el()[0]);
		LootGraphics.init();
		MagicGraphics.init();
		if(!getModule('engine').isSilent()) {
			AudioGraphics.init();
		}
	},
	
	isScaled: function() {
		return currentScale != null;
	},
	
	isReady: function() {
		return Sprites.isReady() && textStore && textStore.isReady();
	},
	
	getText: function(key) {
		return textStore.get.apply(textStore, arguments);
	},

	getLocale: function() {
		return textStore.localeName;
	},
	
	attachHandler: function(moduleName, event, element, handler) {
		var modules = { gameboard: BoardGraphics, world: WorldGraphics };
		modules[moduleName.toLowerCase()].attachHandler(event, element, handler);
	},
	
	get: function(selector, context, returnEmpty) {
		var ret = context ? context.find(selector) : $(selector);
		if(returnEmpty || ret.length > 0) {
			return ret;
		}
		return null;
	},
	
	addStyleRule: function(selector, rules, sheet) {
		sheet = sheet || styleSheet;
		if(sheet.addRule) {
			// Useless goddamn IE non-standard API. Rabble rabble.
			var length = sheet.cssRules.length;
			sheet.addRule(selector, rules);
			return length;
		} else {
			return sheet.insertRule(selector + '{' + rules + '}', 0);
		}
	},

	removeStyleRule: function(index) {
		styleSheet.deleteRule(index);
	},
	
	make: function(className, tagName) {
		tagName = tagName || 'div';
		return $('<' + tagName + '>').addClass(className);
	},
	
	worldWidth: function() {
		if(_ww == null) {
			_ww = $('.world').width();
		}
		return _ww;
	},
	
	worldHeight: function() {
		if(_wh == null) {
			_wh = $('.world').height();
		}
		return _wh;
	},
	
	addToGame: function(entity) {
		$('#gameContainer').append(entity.el ? entity.el() : entity);
	},
	
	addToBoard: function(entity) {
		$('.gameBoard').append(entity.el ? entity.el() : entity);
	},
	
	addToMenu: function(entity) {
		$('.menuBar').append(entity.el ? entity.el() : entity);
	},
	
	// The sun or moon climbs to the middle of the sky and sinks again as the day goes on
	moveCelestial: function(entity) {
		var pos = entity.p();
		var height = (Math.abs(pos - Graphics.worldWidth() / 2) / (Graphics.worldWidth() / 2)) * 30;
		WorldGraphics.sky().moveSun(pos, Math.floor(height), CELESTIAL_MOVE);
	},

	updateSun: function(celestial) {
		WorldGraphics.sky().showSun(celestial.animationRow, celestial.frame);
	},

	// How much of the sun the Eclipse has eaten, from 0 to 1
	setSunBite: function(bite) {
		WorldGraphics.sky().setBite(bite);
	},

	// Where the village's buildings stand, each keeping a light burning at night
	setVillageLights: function(xs) {
		WorldGraphics.sky().setLights(xs);
	},

	// The duskshards found so far, gathered in the tower that stands at x
	setShards: function(count, x) {
		WorldGraphics.village().setShards(count, x);
	},
	
	setNight: function(night) {
		if(night) {
			$('body').addClass('night');
		} else {
			$('body').removeClass('night');
		}
	},
	
	// Day turns to night or back: the sun (or moon) sets, the other rises at the far left
	phaseTransition: function(celestial, callback) {
		var sky = WorldGraphics.sky();
		var below = Graphics.worldHeight() + 10;
		sky.moveSun(celestial.p(), below, CELESTIAL_MOVE);
		$('body').toggleClass('night');
		var _g = this;
		setTimeout(function() {
			celestial.animation($('body').hasClass('night') ? 1 : 0);
			sky.moveSun(SKY_EDGE, below, 0);
			setTimeout(function() {
				_g.raiseCelestial(celestial);
				if(callback != null) {
					callback();
				}
			}, 500);
		}, 900);
	},
	
	raiseCelestial: function(celestial) {
		celestial.p(15);
		this.moveCelestial(celestial);
	},
	
	// A building joins the village: standing if it has been raised, otherwise still underground
	addBuilding: function(building, standing) {
		WorldGraphics.village().add(building, {
			sprite: building.options.spriteName,
			row: building.animationRow || 0,
			x: building.p(),
			standing: standing
		});
	},

	removeBuilding: function(building) {
		WorldGraphics.village().remove(building);
	},

	// The bars of materials delivered to a building; once there are any, the building
	// it will replace lifts for it
	updateCosts: function(building) {
		var show = false;
		var costs = [];
		for(var r in building.requiredResources) {
			var total = building.options.type.cost[r];
			var has = total - building.requiredResources[r];
			if(has > 0) show = true;
			costs.push({ kind: r, share: has / total });
		}
		WorldGraphics.village().setCosts(building, costs);
		if(show) {
			var replaces = building.getReplaces(State);
			if(replaces) {
				Graphics.markUpgrading(replaces, building);
			}
		}
	},

	// The building on a point of the screen that the keeper can be asked to see to first
	buildingAt: function(clientX, clientY) {
		return WorldGraphics.village().buildingAtClient(clientX, clientY);
	},

	// The star over the building the keeper sees to first; null takes it down
	markPriority: function(building) {
		WorldGraphics.village().setPriority(building);
	},
	
	// The cell of the board under a point on the screen, or null
	tileAt: function(clientX, clientY) {
		return BoardGraphics.cellAt(clientX, clientY);
	},

	// The size of a cell of the board, in pixels
	tileSize: function() {
		return BoardGraphics.cellSize();
	},

	// Flashes, beams, blasts and loot over the world and the board, and shaking it
	effects: function() {
		return BoardGraphics.effects();
	},

	selectTile: function(cell) {
		BoardGraphics.select(cell);
	},

	deselectTile: function() {
		BoardGraphics.select(null);
	},

	// A building lifts while its upgrade gathers materials, and can be clicked for it
	markUpgrading: function(building, upgrade) {
		WorldGraphics.village().setUpgrade(building, upgrade || null);
	},
	
	// The keeper raises a building out of the ground; the building it replaces sinks away
	raiseBuilding: function(building, callback) {
		var village = WorldGraphics.village();
		if(building.options.type.isBase) {
			village.hidePile(true);
		}
		var replaces = building.getReplaces(State);
		if(replaces) {
			village.setSunk(replaces, true);
		}
		village.raise(building, BUILD_TIME);
		clearTimeout(raising.get(building));
		raising.set(building, setTimeout(function() {
			raising.delete(building);
			if(building.options.type.isBase) {
				village.hidePile(false);
			}
			village.raised(building);
			if(building.options.type.tileMod) {
				changeTiles(
					[building.options.type.tileMod],
					building.options.type.tileMod + building.options.type.tileLevel,
					building.options.type.tileMod + (building.options.type.tileLevel - 1)
				);
			}
			callback(building);
		}, BUILD_TIME));
	},

	// Night fell before the building stood: it drops back into the ground
	sinkBuilding: function(building) {
		clearTimeout(raising.get(building));
		raising.delete(building);
		WorldGraphics.village().sink(building);
		var replaces = building.getReplaces(State);
		if(replaces) {
			WorldGraphics.village().setSunk(replaces, false);
		}
	},

	openChest: function(chest) {
		WorldGraphics.actors().openChest(chest);
	},
	
	// The board's element, which holds the world, the tiles and the interface beside them
	board: function() {
		return BoardGraphics.el()[0];
	},

	// The keeper's status: hearts, shield, sword, experience, the ward and tonight's
	// blessing (src/ui/status.ts)
	status: function() {
		return status;
	},

	// Words that come up over the world and the board (src/ui/notices.ts)
	notices: function() {
		return notices;
	},

	updateExperience: function(xp, toLevel) {
		status.setExperience(xp, toLevel);
	},

	numHearts: function() {
		return status.numHearts();
	},

	updateHealth: function(health, maxHealth) {
		status.setHealth(health, maxHealth);
	},

	updateShield: function(shield, maxShield) {
		status.setShield(shield, maxShield);
	},

	updateSword: function(sword, maxSword) {
		status.setSword(sword, maxSword);
	},

	fadeOut: function(callback) {
		$('.gameBoard').addClass('hidden');
		if(callback) {
			setTimeout(callback, 1000);
		}
	},
	
	notifySave: function() {
		$('.saveSpinner').addClass('active');
		setTimeout(function(){
			$('.saveSpinner').removeClass('active');
		}, 1500);
	},
	
	// A beam of light comes down on the keeper and spreads across the sky
	levelUp: function(dude) {
		Graphics.effects().levelBeam(dude.p());
	},
	
	// Monsters' health bars are drawn with them (src/render/actors.ts); a boss's is its own
	updateHealthBar: function(entity) {
		if(entity.isBoss) {
			Graphics.setBossHealth(entity.hp(), entity.getMaxHealth());
		}
	},
	
	handleDayBreak: function(dayNumber) {
		Graphics.endDragonFight();
		notices.dayBreak(Graphics.getText('DAY_N', dayNumber));
	},
	
	// A monster falls: its health bar goes, and a breath of shadow leaves it
	monsterKilled: function(monster) {
		WorldGraphics.actors().killMonster(monster);
		Graphics.effects().smoke(monster.p());
	},
	
	enablePlayButton: function() {
		$('#loadingScreen .saveSpinner').addClass('hidden');
		document.title = Graphics.getText('TITLE');
		if($('#loadingScreen .subtitle').length == 0) {
			$('#loadingScreen').append(Graphics.make('subtitle').text(Graphics.getText('SUBTITLE')));
		}
		Graphics.drawSaveSlots();
	},
	
	// The board goes back to normal once the dragon is beaten, or day breaks
	endDragonFight: function() {
		if(isDragon) {
			changeTiles(['clay', 'cloth', 'grain'], '', 'dragonFight');
			isDragon = false;
			Graphics.setBossHealth(0, 0);
		}
	},

	setBossHealth: function(hp, max) {
		status.setBossHealth(hp, max);
	},
	
	// The dragon flies down onto the field, the board tilting under it, and roars
	landDragon: function(dragon, cb) {
		isDragon = true;
		dragon.setPosture('idle');
		dragon.p(dragon.view.x);
		dragon.animation(1, true, function(frame) {
			if(frame == 2) {
				EventManager.trigger('flap');
			}
		});
		dragon.setNeckMount({ x: 50, y: 47 });
		dragon.comeDown(DRAGON_FLIES_FROM, 1000);
		var tiltClass = dragon.options.flip ? 'flipTilted' : 'tilted';
		setTimeout(function() {
			EventManager.trigger('landDragon');
			dragon.animation(0);
			dragon.animationOnce(2, function(frame) {
				dragon.setNeckMount((function() {
					switch(frame) {
						case 0:
							return { x: 50, y: 47 };
						case 1:
							return { x: 30, y: 75 };
						case 2:
							return { x: 20, y: 105 };
						case 3:
							return null;
					}
				})());
			});
			dragon.setPosture('idle', 500);
			BoardGraphics.el().addClass(tiltClass);
			changeTiles(['clay', 'cloth', 'grain'], 'dragonFight', '');
		}, 1000);
		setTimeout(function() {
			Graphics.setBossHealth(dragon.hp(), dragon.getMaxHealth());
			BoardGraphics.el().removeClass(tiltClass);
			dragon.setPosture('windup', 500);
		}, 1500);
		setTimeout(function() { EventManager.trigger('roar'); dragon.setPosture('roar', 500); }, 2000);
		setTimeout(function() { Graphics.effects().shake(ROAR_SHAKE, 1000); }, 2500);
		setTimeout(function() { dragon.setPosture('idle', 500); }, 3500);
		if(cb) {
			setTimeout(cb, 4000);
		}
	},
	
	drawSaveSlots: function() {
		var saveSlots = Graphics.make('saveSlots', 'ul');
		for(var i = 0; i < 3; i++) {
			var slotInfo = State.getSlotInfo(i);
			var slot = drawSlot(slotInfo, i);
			saveSlots.append(slot);
		}
		Graphics.get('#loadingScreen').append(saveSlots);
	},
	
	replaceSlot: function(slotIndex, slotInfo) {
		var newSlot = drawSlot(slotInfo, slotIndex);
		var oldSlot = Graphics.get('.saveSlot:nth-child(' + (slotIndex + 1) + ')');
		oldSlot.before(newSlot);
		oldSlot.remove();
	},

	// Keeps the import form open, so the code can be fixed
	rejectImport: function(slotIndex) {
		$('.saveSlot:nth-child(' + (slotIndex + 1) + ') .labelText').text(Graphics.getText('IMPORT_INVALID'));
	},

	drawSlot: drawSlot
};

register('graphics/graphics', Graphics);
export default Graphics;

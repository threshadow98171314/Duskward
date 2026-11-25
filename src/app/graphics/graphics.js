import EventManager from '../eventmanager.js';
import TextStore from '../textStore.js';
import Options from '../gameoptions.js';
import BoardGraphics from './gameboard.js';
import WorldGraphics from './world.js';
import LootGraphics from './loot.js';
import MagicGraphics from './magic.js';
import AudioGraphics from './audio.js';
import Sprites from './sprites.js';
import { StatusBar, heartsFor } from '../../ui/status.ts';
import { Notices } from '../../ui/notices.ts';
import { TitleScreen } from '../../ui/title.ts';
import { EndScreen } from '../../ui/ending.ts';
import { MenuBar } from '../../ui/menu.ts';
import State from '../gamestate.js';
import GameBoard from '../gameboard.js';

var MIN_SCREEN_WIDTH = 600, MIN_SCREEN_HEIGHT = 650, PORTRAIT_HEIGHT = 725;

var textStore;
var _ww = null, _wh = null;
var currentScale = null;
// The keeper's status beside the board, and the words that come up over it (src/ui)
var status = null;
var notices = null;
var isDragon = false;
// The keeper, as the engine finds them
var keeper = function() {
	return null;
};

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
	var dude = keeper();
	if(dude) {
		Graphics.effects().sparks(dude.p() + (dude.facing == 'left' ? -BLOW_REACH : BLOW_REACH));
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
		var board = BoardGraphics.el().classList;
		classNames(classToRemove).forEach(function(name) {
			board.remove(name);
		});
		classNames(classToAdd).forEach(function(name) {
			board.add(name);
		});
		BoardGraphics.showKinds(tileTypes);
	}, 300);
}

// The classes in a list of them, which may be empty
function classNames(list) {
	return list.split(/\s+/).filter(Boolean);
}

// The end screen (src/ui/ending.ts), made the first time it comes down
var endScreen = null;
function ending() {
	if(endScreen == null) {
		endScreen = new EndScreen(document.body, {
			clear: Graphics.getText('CLEAR'),
			continue: Graphics.getText('CONTINUE'),
			newGamePlus: Graphics.getText('NEWGAMEPLUS')
		}, continueGame, newGamePlus);
	}
	return endScreen;
}

// The world blows up in light, and the counts of the game come down
function gameOver(counts) {
	document.body.classList.add('bigExplosion');
	setTimeout(function() {
		ending().show(Object.keys(counts || {}).map(function(key) {
			return [Graphics.getText(key) || 0, counts[key]];
		}));
	}, 2000);
}

function continueGame() {
	EventManager.trigger('phaseChange', [false]);
	ending().hide();
	BoardGraphics.el().classList.remove('dragonFight');
	var page = document.body.classList;
	setTimeout(function() {
		page.add('fadeOut');
	}, 1400);
	setTimeout(function() {
		page.remove('bigExplosion', 'fadeOut');
	}, 2800);
}

function newGamePlus() {
	ending().hide();
	BoardGraphics.el().classList.remove('dragonFight');
	var page = document.body.classList;
	page.remove('night');
	setTimeout(function() {
		page.add('fadeOut');
		EventManager.trigger('prestige');
	}, 1400);
	setTimeout(function() {
		page.remove('bigExplosion', 'fadeOut');
	}, 2800);
}

function dropBlock(block, building) {
	Graphics.updateCosts(building);
}

// The title screen (src/ui/title.ts), with a slot for each saved game
var titleScreen = null;
function title() {
	if(titleScreen == null) {
		titleScreen = new TitleScreen(document.getElementById('loadingScreen'), {
			newGame: Graphics.getText('NEWGAME'),
			import: Graphics.getText('IMPORT'),
			export: Graphics.getText('EXPORT'),
			delete: Graphics.getText('DELETE'),
			confirm: Graphics.getText('CONFIRM'),
			cancel: Graphics.getText('CANCEL'),
			importCode: Graphics.getText('IMPORT_CODE'),
			exportCode: Graphics.getText('EXPORT_CODE'),
			areYouSure: Graphics.getText('ARE_YOU_SURE'),
			importInvalid: Graphics.getText('IMPORT_INVALID'),
			day: function(day) {
				return Graphics.getText('DAY_N', day);
			}
		}, {
			choose: function(slot) {
				EventManager.trigger('slotChosen', [slot]);
			},
			exportCode: function(slot) {
				return State.getExportCode(slot);
			},
			importCode: function(slot, code) {
				EventManager.trigger('importSlot', [slot, code]);
			},
			remove: function(slot) {
				EventManager.trigger('deleteSlot', [slot]);
			}
		});
	}
	return titleScreen;
}

// A save slot's game, as the title screen shows it; null for an empty slot
function savedGame(slotInfo) {
	return slotInfo === 'empty' ? null : slotInfo;
}

// The menu bar along the bottom of the page (src/ui/menu.ts); there is only the one
var menuBar = null;

// The game is scaled down to fit a small window, by a rule in a style sheet of its own
var scaleSheet = null;
var listeningToResize = false;
function scaleToViewport() {
	var widthScale = document.documentElement.clientWidth / MIN_SCREEN_WIDTH,
		heightScale = document.documentElement.clientHeight /
			(GameBoard.options.mobile ? PORTRAIT_HEIGHT : MIN_SCREEN_HEIGHT);

	if(!scaleSheet) {
		var style = document.createElement('style');
		document.head.appendChild(style);
		scaleSheet = style.sheet;
	}

	var minScale = Math.min(widthScale, heightScale);
	if(minScale != currentScale && minScale < 1) {
		currentScale = minScale;
		if(scaleSheet.cssRules.length > 0) {
			scaleSheet.deleteRule(0);
		}
		scaleSheet.insertRule('#loadingScreen, #gameContainer { transform-origin: 50% 0 0; transform: scale(' + minScale + '); }', 0);
	} else if(minScale != currentScale && currentScale != null) {
		currentScale = null;
		if(scaleSheet.cssRules.length > 0) {
			scaleSheet.deleteRule(0);
		}
	}
}

function activateHyperspace() {
	document.body.classList.add('hyperspace');
	setTimeout(function() {
		document.body.classList.remove('hyperspace');
	}, 1000);
}

function setPaused(p) {
	document.body.classList.toggle('paused', p);
}

var Graphics = {
	init: function(opts) {
		isDragon = false;
		keeper = opts.keeper || keeper;
		document.body.classList.remove('night');
		document.body.classList.toggle('ios', !!opts.ios);

		textStore = new TextStore(Options.get('language') || TextStore.detectLocale());
		document.documentElement.lang = textStore.localeName == 'zh-TW' ? 'zh-Hant-TW' : 'en';

		scaleToViewport();
		if(!listeningToResize) {
			listeningToResize = true;
			window.addEventListener('resize', scaleToViewport);
		}
		
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
			title().longLoad(Graphics.getText('LONG_LOAD'), Graphics.getText('NO_MUSIC'),
				window.location + (window.location.search.length > 0 ? '&' : '?') + 'nomusic');
		});
		if(menuBar == null) {
			menuBar = new MenuBar(document.querySelector('.menuBar'));
		}

		BoardGraphics.init();
		WorldGraphics.init();
		status = new StatusBar(BoardGraphics.el(), WorldGraphics.element());
		notices = new Notices(WorldGraphics.element(), BoardGraphics.el());
		LootGraphics.init();
		MagicGraphics.init();
		if(!opts.silent) {
			AudioGraphics.init();
		}
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
	
	// The size of the world, as laid out on the page
	worldWidth: function() {
		if(_ww == null) {
			_ww = parseFloat(getComputedStyle(WorldGraphics.element()).width);
		}
		return _ww;
	},

	worldHeight: function() {
		if(_wh == null) {
			_wh = parseFloat(getComputedStyle(WorldGraphics.element()).height);
		}
		return _wh;
	},

	// The world's element, above the board
	world: function() {
		return WorldGraphics.element();
	},

	// Adds a part to the menu bar
	addToMenu: function(part) {
		menuBar.add(part);
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
		document.body.classList.toggle('night', !!night);
	},
	
	// Day turns to night or back: the sun (or moon) sets, the other rises at the far left
	phaseTransition: function(celestial, callback) {
		var sky = WorldGraphics.sky();
		var below = Graphics.worldHeight() + 10;
		sky.moveSun(celestial.p(), below, CELESTIAL_MOVE);
		document.body.classList.toggle('night');
		var _g = this;
		setTimeout(function() {
			celestial.animation(document.body.classList.contains('night') ? 1 : 0);
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
		return BoardGraphics.el();
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
		BoardGraphics.el().classList.add('hidden');
		if(callback) {
			setTimeout(callback, 1000);
		}
	},
	
	// The spinners turn for a moment as the game is saved
	notifySave: function() {
		var spinners = document.querySelectorAll('.saveSpinner');
		spinners.forEach(function(spinner) {
			spinner.classList.add('active');
		});
		setTimeout(function() {
			spinners.forEach(function(spinner) {
				spinner.classList.remove('active');
			});
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
	
	// The game is ready to play: the title screen shows the saved games
	enablePlayButton: function() {
		document.title = Graphics.getText('TITLE');
		title().show(Graphics.getText('SUBTITLE'), [0, 1, 2].map(function(slot) {
			return savedGame(State.getSlotInfo(slot));
		}));
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
			BoardGraphics.el().classList.add(tiltClass);
			changeTiles(['clay', 'cloth', 'grain'], 'dragonFight', '');
		}, 1000);
		setTimeout(function() {
			Graphics.setBossHealth(dragon.hp(), dragon.getMaxHealth());
			BoardGraphics.el().classList.remove(tiltClass);
			dragon.setPosture('windup', 500);
		}, 1500);
		setTimeout(function() { EventManager.trigger('roar'); dragon.setPosture('roar', 500); }, 2000);
		setTimeout(function() { Graphics.effects().shake(ROAR_SHAKE, 1000); }, 2500);
		setTimeout(function() { dragon.setPosture('idle', 500); }, 3500);
		if(cb) {
			setTimeout(cb, 4000);
		}
	},
	
	// A code was brought into a slot: it shows the game it held
	replaceSlot: function(slotIndex, slotInfo) {
		title().replace(slotIndex, savedGame(slotInfo));
	},

	// The code held no save: the slot keeps it, to be fixed
	rejectImport: function(slotIndex) {
		title().rejectImport(slotIndex);
	}
};

export default Graphics;

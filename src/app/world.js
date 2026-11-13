import $ from '../vendor/jquery.js';
import EventManager from './eventmanager.js';
import Graphics from './graphics/graphics.js';
import Building from './entity/building.js';
import Content from './gamecontent.js';
import GameState from './gamestate.js';
import ActionFactory from './action/actionfactory.js';
import MonsterFactory from './entity/monster/monsterfactory.js';
import Block from './entity/block.js';
import Gem from './entity/gem.js';
import Resources from './resources.js';
import Celestial from './entity/celestial.js';
import Dude from './entity/dude.js';
import Star from './entity/star.js';
import WorldEffect from './entity/worldeffect.js';
import { register } from './modules.js';
import Engine from './engine.js';
import GameBoard from './gameboard.js';
import Options from './gameoptions.js';
import { built } from './effects.js';
import FieldView from './fieldview.js';
import { MONSTERS } from '../content/monsters.ts';
import * as Field from '../core/field.ts';
import * as Day from '../core/day.ts';
import { bounty, duskWard, harvestResource } from '../core/harvest.ts';
import { canBuild as canBuildIn } from '../core/progress.ts';
import { dragonMultiplier, monsterMultiplier } from '../core/combat.ts';

var hasteTick = false;
var dude = null;
// Where the keeper and the monsters are and what they are doing (src/core/field.ts)
var field = null;
var celestial = null;
var gem = null;
var effects = {};
var clock = Day.createClock();
var theDragon = null;
var stuff = [];
// The ice the dragon's breath leaves around the keeper
var iceBlock = null;
var inTransition = false;
var gameLoop = null;
var star = null;
var prioritizedBuilding = null;
var recorded = null;
var streak = 0;
// What the current move has gathered by day, towards a bounty
var moveGathered = {};
var casualNight = false;

var _debugMultiplier = 1;
// Debug cheat that multiplies gathered resources, also callable from the browser console
var multiplier = window.multiplier = function(n) {
	_debugMultiplier = n > 0 ? n : 1;
	if(World.getDude()) {
		reinitializeAllActions();
	}
};

var World = {
		
	options: {
		dayMoves: 20,
		nightMoves: 15
	},
	init: function(opts) {
		$.extend(this.options, opts);
		dude = null;
		field = null;
		celestial = null;
		star = null;
		gem = null;
		stuff.length = 0;
		effects = {};
		clock = Day.createClock();
		theDragon = null;
		var deferredCallbacks = [];
		streak = 0;
		moveGathered = {};
		// For debugging from the browser console
		window.field = function() {
			return field;
		};
		var casualNight = false;
		
		EventManager.bind('difficultyChanged', difficultyToggle);
		EventManager.bind('launchDude', launchDude);
		EventManager.bind('wipeMonsters', wipeMonsters);
		EventManager.bind('landDragon', wipeMonsters);
		EventManager.bind('damageAll', damageAllMonsters);
		EventManager.bind('healDude', healDude);
		EventManager.bind('hurtDude', hurtDude);
		EventManager.bind('newEntity', handleNewEntity);
		EventManager.bind('removeEntity', handleRemoveEntity);
		EventManager.bind('buildingComplete', handleNewEntity);
		EventManager.bind('buildingComplete', clearPriorityIfNeeded);
		EventManager.bind('tilesCleared', handleTileClear);
		EventManager.bind('noMoreMoves', handleNoMoreMoves);
		EventManager.bind('tilesSwapped', handleTilesSwapped);
		EventManager.bind('updateGem', updateGem);
		EventManager.bind('phaseChange', phaseTransition);
		EventManager.bind('newStateEffect', addStateEffect);
		EventManager.bind('endStateEffect', endStateEffect);
		EventManager.bind('levelUp', wipeMonsters);
		EventManager.bind('resourceStoreChanged', handleResourceStoreChanged);
		EventManager.bind('prioritizeBuilding', prioritizeBuilding);
		EventManager.bind('callDragon', callDragon);
		EventManager.bind('dropChest', dropChest);
		EventManager.bind('keySequenceComplete', multiplier.bind(this, 5));
		EventManager.bind('fillEquipment', function() {
			fillDefense();
			fillAttack();
		});
		EventManager.bind('fillWard', function() {
			gainWard(GameState.maxWard());
		});
		EventManager.bind('wardCapacityChanged', function() {
			EventManager.trigger('wardChanged', [GameState.ward, GameState.maxWard()]);
		});
		EventManager.bind('extendDay', extendDay);
		EventManager.bind('dawnlightHarvest', harvest);
		EventManager.bind('gameLoaded', function() {
			updateGem();
			for(var i in GameState.buildings) {
				var building = GameState.buildings[i];
				if(building.built && !building.obsolete) {
					Graphics.addToWorld(building);
					Graphics.setPosition(building, building.p());
					if(building.options.type.tileMod) {
						$('.gameBoard').addClass(building.options.type.tileMod + building.options.type.tileLevel);
					}
					building.el().css('bottom', '0px');
					building.el().find('.blockPile').css('top', '100%');
					deferredCallbacks.push(built.bind(null, building.options.type));
				} else if(!building.obsolete && canBuild(building.options.type)) {
					Graphics.addToWorld(building);
					Graphics.setPosition(building, building.p());
					Graphics.updateCosts(building);
				}

				if(building.options.type.className == GameState.prioritizedBuilding) {
					prioritizeBuilding(building);
				}
			}
			
			while(deferredCallbacks.length > 0) {
				(deferredCallbacks.pop())();
			}
			
			if(gameLoop != null) {
				clearInterval(gameLoop);
			}
			gameLoop = setInterval(makeStuffHappen, 100);
			inTransition = false;
		});
	},
	
	// By day, what the keeper should work on next: raising a building that has all
	// it needs, or carrying a block to the building that needs it most
	nextTask: function() {
		if(clock.night) {
			return null;
		}
		
		// If there's a prioritized building, set up the task in advance
		var priorityMove = null;
		if(prioritizedBuilding) {
			for(var b in GameState.stores) {
				var block = GameState.stores[b];
				var resource = block.options.type.className;
				if(!block.gone && block.spaceLeft() == 0 && prioritizedBuilding.requiredResources[resource] > 0) {
					priorityMove = carryTask(block, prioritizedBuilding);
				}
			}
		}
		
		// Look for buildable buildings first
		var totalNeeded = null;
		var moveAction = null;
		var priority = null;
		for(var t in Content.BuildingType) {
			var buildingType = Content.BuildingType[t];
			var building = GameState.getBuilding(buildingType);
			// Add it to the buildings list, if it should be available to build and it isn't.
			if(building == null && canBuild(buildingType)) {
				building = new Building({
					type: buildingType
				});
				GameState.buildings.push(building);
				Graphics.addToWorld(building);
				Graphics.setPosition(building, building.p());
			}
			
			// If it's ready to build, build it.
			if(building != null && building.readyToBuild()) {
				return buildTask(building);
			}
			
			// Use the prioritized move, if we have one
			else if(priorityMove) {
				moveAction = priorityMove;
			}
			
			// Otherwise, look for moveable resources
			else if(building != null && !building.built) {
				for(var b in GameState.stores) {
					var block = GameState.stores[b];
					if(!block.gone && block.spaceLeft() == 0) {
						var resource = block.options.type.className;
						var required = building.requiredResources[resource];
						var highPriority = priority == null || buildingType.priority < priority || 
								(buildingType.priority == priority && 
										(totalNeeded == null || required > totalNeeded));
						if(required > 0 && highPriority) {
							// We can move this block!
							moveAction = carryTask(block, building);
							priority = buildingType.priority;
							totalNeeded = required;
						}
					}
				}
			}
		}
		// Otherwise, carry the block that is needed most
		return moveAction;
	},

	// The keeper stops what they are doing, e.g. on levelling up
	interruptKeeper: function() {
		if(field != null) {
			handleFieldEvents(Field.interrupt(field));
		}
	},

	// A wing buffet throws the keeper back
	pushKeeper: function(distance) {
		Field.push(field, distance);
	},
	
	removeBuilding: function(building) {
		building.obsolete = true;
		stuff.splice(stuff.indexOf(building), 1);
		building.el().remove();
	},
	
	hasEffect: function(effectName) {
		return effects[effectName] != null;
	},
	
	getDude: function() {
		return dude;
	},
	
	canMove: function() {
		return !inTransition && dude.isAlive();
	},
	
	isNight: function() {
		return clock.night;
	},

	isDusk: function() {
		return clock.dusk;
	},
	
	startRecording: function() {
		console.log("Beginning resource recorder");
		recorded = 0;
	},
	
	reportRecord: function() {
		console.log(recorded + " resources have been gained.");
	},
	
	removeAllEffects: function(effectClass) {
		var len = stuff.length;
		while(len--) {
			var thing = stuff[len];
			if(thing instanceof WorldEffect && thing.options.effectClass == effectClass) {
				stuff.splice(len, 1);
				thing.el().remove();
			}
		}
	},
	
	gameOver: function() {
		GameState.count('DRAGONS', 1);
		GameState.save();
		Graphics.notifySave();
		EventManager.trigger('gameOver', [GameState.counts]);
	},
	
	getDebugMultiplier: function() {
		return _debugMultiplier;
	},

	setPause: function(paused) {
		if(paused && gameLoop) {
			clearInterval(gameLoop);
			gameLoop = false;
		} else {
			gameLoop = setInterval(makeStuffHappen, 300);
		}
	}
};

function prioritizeBuilding(building) {
	if(clock.night) return;
	if(prioritizedBuilding && prioritizedBuilding == building) {
		// Clear on a second click
		clearPriorityIfNeeded(building);
		EventManager.trigger('deprioritize');
	} else {
		if(!star) {
			star = new Star();
			EventManager.trigger('newEntity', [star]);
		}
		EventManager.trigger('prioritize');
		prioritizedBuilding = building;
		GameState.prioritizedBuilding = building.options.type.className;
		star.p(building.options.type.position);
		Graphics.setPosition(star, star.p());
		star.el().css('display', 'block');
	}
}

function clearPriorityIfNeeded(building) {
	if(prioritizedBuilding == building) {
		prioritizedBuilding = null;
		GameState.prioritizedBuilding = null;
		star.el().css('display', 'none');
	}
}

function canBuild(buildingType) {
	return canBuildIn(buildingType, {
		level: GameState.level,
		prestige: GameState.prestige,
		gems: GameState.gem || 0,
		hasBuilding: function(className) {
			return GameState.hasBuilding(Content.getBuildingType(className));
		}
	});
}

function fillDefense() {
	dude.shield = GameState.maxShield();
	Graphics.updateShield(dude.shield, GameState.maxShield());
}

function fillAttack() {
	dude.sword = GameState.maxSword();
	Graphics.updateSword(dude.sword, GameState.maxSword());
}

function addMana(num) {
	GameState.mana = GameState.mana ? GameState.mana + num : num;
	if(GameState.mana > GameState.maxMana()) {
		GameState.mana = GameState.maxMana();
	}
	EventManager.trigger("updateMana", [GameState.mana, GameState.maxMana()]);
}

function spawnMonster(monsterType, tiles, side) {
	var monster = Field.spawn(field, monsterType, MONSTERS[monsterType], side, {
		tiles: tiles,
		multiplier: monsterMultiplier(GameState.prestige)
	});
	FieldView.addMonster(monster);
}

function dropChest(x, forceLoot) {
	// Chests do not survive the daylight
	if(field == null || !clock.night) {
		return;
	}
	FieldView.addChest(Field.addChest(field, x), forceLoot);
}

function carryTask(block, building) {
	return { type: 'carry', to: building.dudeSpot(), block: block, building: building };
}

function buildTask(building) {
	return { type: 'build', at: building.dudeSpot(), building: building };
}

function updateGem() {
	if(GameState.gem > 0) {
		if(gem == null) {
			gem = new Gem();
			gem.p(Content.BuildingType.Tower.position);
			EventManager.trigger('newEntity', [gem]);
		}
		gem.animation(GameState.gem - 1);
	}
}

function reinitializeAllActions() {
	for(var i in stuff) {
		var entity = stuff[i];
		if(!entity.uninterruptable && entity.action != null) {
			entity.action.reinitialize(entity);
		}
	}
}

function addStateEffect(effect) {
	var existingEffect = effects[effect.className];
	if(existingEffect != null) {
		clearTimeout(existingEffect);
	}
	if(effect.freezesKeeper) {
		freezeKeeper();
	}
	effects[effect.className] = setTimeout(function() {
		if(effect.freezesKeeper) {
			thawKeeper();
		}
		effects[effect.className] = null;
		reinitializeAllActions();
	}, effect.duration);
	
	reinitializeAllActions();
}

function endStateEffect(effect) {
	var existingEffect = effects[effect.className];
	effects[effect.className] = null;
	if(existingEffect != null) {
		clearTimeout(existingEffect);
		if(effect.freezesKeeper) {
			thawKeeper();
		}
	}
}

function freezeKeeper() {
	dude.paused = true;
	if(iceBlock == null) {
		iceBlock = new WorldEffect({effectClass: 'iceBlock', spriteName: 'dragoneffects'});
		iceBlock.p(dude.p());
		EventManager.trigger('newEntity', [iceBlock]);
	}
}

function thawKeeper() {
	dude.paused = false;
	EventManager.trigger('removeEntity', [iceBlock]);
	iceBlock = null;
}

function handleNewEntity(entity) {
	stuff.push(entity);
}

function handleRemoveEntity(entity) {
	for(var i in stuff) {
		if(stuff[i] == entity) {
			stuff.splice(i, 1);
			return;
		}
	}
}

function handleTilesSwapped() {
	harvestBounty();
	if(!clock.night) {
		advanceTime();
		makeDudeHungry();
	}
}

// A move that gathered many kinds by day earns extra of each, once it has settled
function harvestBounty() {
	var earned = bounty(moveGathered);
	moveGathered = {};
	var situation = harvestSituation();
	if(earned == null || (situation.night && !situation.inTransition)) {
		return;
	}
	for(var typeName in earned.extra) {
		var effect = harvestResource(typeName, earned.extra[typeName], harvestSituation(), Content.getResourceType.bind(Content));
		if(effect != null) {
			applyHarvest(effect);
		}
	}
	EventManager.trigger('bounty', [earned.kinds, earned.percent]);
}

function handleNoMoreMoves() {
	if(clock.night) {
		// Take damage
		dude.takeDamage(Math.floor(dude.hp() / 2));
	} else {
		// Burn daylight
		advanceTime(5);
	}
}

// What the rules need to know about the world to settle gathered tiles
function harvestSituation() {
	return {
		night: clock.night,
		dusk: clock.dusk,
		inTransition: inTransition,
		dragon: theDragon != null,
		hasBuilding: function(className, current) {
			return GameState.hasBuilding(Content.getBuildingType(className), current);
		},
		multiplier: _debugMultiplier
	};
}

function handleTileClear(resourcesGained, side) {
	// Everything cleared at dusk strengthens the ward for the coming night
	var ward = duskWard(resourcesGained, harvestSituation());
	if(ward !== null) {
		gainWard(ward);
	}

	// One kind at a time: lighting lanterns can bring the dawn partway through
	for(var typeName in resourcesGained) {
		var situation = harvestSituation();
		var daytime = !(situation.night && !situation.inTransition);
		if(recorded != null && daytime) {
			recorded += resourcesGained[typeName];
		}
		// Resources gathered by day count towards the move's bounty; gems do not
		if(daytime && typeName != 'mana') {
			moveGathered[typeName] = (moveGathered[typeName] || 0) + resourcesGained[typeName];
		}
		var effect = harvestResource(typeName, resourcesGained[typeName], situation, Content.getResourceType.bind(Content));
		if(effect != null) {
			applyHarvest(effect, side);
		}
	}
}

function applyHarvest(effect, side) {
	switch(effect.type) {
	case 'dragon':
		doDragonAttack(effect.attack);
		break;
	case 'spawn':
		spawnMonster(effect.monster, effect.tiles, side);
		break;
	case 'shield':
		fillDefense();
		break;
	case 'sword':
		fillAttack();
		break;
	case 'dawn':
		// Lighting lanterns brings the dawn closer
		advanceTime();
		break;
	case 'heal':
		EventManager.trigger("healDude", [effect.amount]);
		break;
	case 'mana':
		addMana(effect.amount);
		break;
	case 'store':
		Resources.collectResource(Content.getResourceType(effect.resource), effect.amount);
		break;
	}
}

function makeStuffHappen() {

	// Cheap hack to implement pause
	if(Engine.paused) return;

	if(field != null) {
		field.haste = World.hasEffect('haste');
		field.timeStopped = World.hasEffect('freezeTime');
		field.keeperFrozen = World.hasEffect('frozen');
		handleFieldEvents(Field.tick(field, fieldHost));
		FieldView.draw(field);
		var dragonOut = theDragon != null && theDragon.isAlive() ? 1 : 0;
		GameState.setIfHigher('ATONCE', Field.living(field).length + dragonOut);
	}

	// Everything else still runs itself: the sun and moon, buildings, effects and the dragon
	if(!hasteTick) {
		var frozen = effects['freezeTime'] != null;
		for(var i = 0; i < stuff.length; i++) {
			var entity = stuff[i];
			if(entity.hostile && !clock.night) {
				// The dragon cannot survive the daylight
				if(entity.action != null) {
					entity.action.terminateAction(entity);
				}
				entity.el().remove();
				entity.gone = true;
			}
			if(!entity.gone) {
				if(!entity.paused && !frozen) {
					runEntity(entity);
				}
			} else if(entity.hostile) {
				if(clock.night && !entity.wiped) {
					dude.gainXp(entity.getXp() * _debugMultiplier);
					advanceTime();
				}
				EventManager.trigger('monsterKilled', [entity]);
				GameState.count('KILLED', 1);
				stuff.splice(i, 1);
				i--;
			}
		}
	}

	hasteTick = !hasteTick;
}

// What the field needs from the rest of the game
var fieldHost = {
	keeperAlive: function() {
		return dude.isAlive();
	},
	keeperBlow: function() {
		var sharp = dude.hasSword();
		return { damage: dude.getDamage(), sharp: sharp };
	},
	hurtKeeper: function(damage, by) {
		dude.takeDamage(damage, { options: { monsterClass: by } });
	},
	nextTask: function() {
		return World.nextTask();
	}
};

function handleFieldEvents(events) {
	events.forEach(function(event) {
		switch(event.type) {
		case 'cue':
			EventManager.trigger(event.name);
			break;
		case 'shot':
			FieldView.shoot(event.projectile);
			break;
		case 'spell':
			GameBoard.addEffectRandomly(event.spell);
			EventManager.trigger('lichSpell');
			break;
		case 'monsterGone':
			monsterGone(event.monster);
			break;
		case 'chestOpened':
			EventManager.trigger('pickupLoot', [FieldView.chest(event.chest.id), _debugMultiplier]);
			Field.removeChest(field, event.chest.id);
			break;
		case 'pickedUp':
			EventManager.trigger('blockUp');
			Graphics.pickUpBlock(event.task.block);
			GameState.removeBlock(event.task.block);
			dude.carrying = event.task.block;
			break;
		case 'delivered':
			dude.carrying = null;
			event.task.building.requiredResources[event.task.block.options.type.className]--;
			EventManager.trigger('blockDown', [event.task.block, event.task.building]);
			break;
		case 'hammering':
			Graphics.raiseBuilding(event.task.building, function() {});
			break;
		case 'built':
			buildingRaised(event.task.building);
			break;
		case 'abandoned':
			if(event.task.type == 'carry' && event.carrying) {
				Resources.returnBlock(event.task.block);
				dude.carrying = null;
			} else if(event.task.type == 'build') {
				Graphics.sinkBuilding(event.task.building);
			}
			break;
		case 'keeperDied':
			keeperDied();
			break;
		}
	});
}

function monsterGone(monster) {
	var view = FieldView.monster(monster.id);
	if(clock.night && !monster.wiped) {
		dude.gainXp(monster.xp * _debugMultiplier);
		advanceTime();
	}
	if(view) {
		EventManager.trigger('monsterKilled', [view]);
	}
	GameState.count('KILLED', 1);
	FieldView.bury(monster.id);
}

function buildingRaised(building) {
	building.built = true;
	EventManager.trigger('buildingComplete', [building]);
	built(building.options.type);
	// Remove replaced building, if necessary
	if(building.options.type.replaces != null) {
		World.removeBuilding(building.getReplaces(GameState));
	}
}

function keeperDied() {
	// Dude is dead. Long live the dude.
	inTransition = true;
	GameState.count('DEATHS', 1);
	GameState.savePersistents();
	Graphics.fadeOut(function() {
		setTimeout(function() {
			stuff.length = 0;
			Graphics.setNight(false);
		}, 500);
		setTimeout(function() {
			Engine.init();
		}, 1900);
	});
}

function runEntity(entity) {
	// Only animate if a new action wasn't created
	entity.think() || entity.animate();
	if(entity.action != null) {
		entity.action.doFrameAction(entity.frame);
	}
}

function launchDude() {
	dude = new Dude();
	dude.makeIdle();
	Graphics.addToWorld(dude);
	field = Field.createField(Graphics.worldWidth());
	field.night = clock.night;
	field.casual = Options.get('casualMode', false);
	Field.climbIn(field);
	FieldView.init(dude);
	dude.p(field.keeper.x);
	Graphics.setPosition(dude, dude.p());
}

function launchCelestial() {
	celestial = new Celestial();
	stuff.push(celestial);
	celestial.animation(0);
	Graphics.addToWorld(celestial);
	Graphics.raiseCelestial(celestial);
	EventManager.trigger('dayBreak', [GameState.dayNumber]);
}

function advanceTime(steps) {
	if(effects['freezeTime'] != null) {
		// Time does not advance when frozen
		return;
	}
	if(celestial != null) {
		var result = Day.advanceClock(clock, World.options, steps == null ? 1 : steps);
		if(result.over) {
			EventManager.trigger('phaseChange', [!clock.night]);
		} else {
			moveCelestial();
			announceDusk(result.duskChanged);
		}
	}
}

function moveCelestial() {
	celestial.p(Math.floor(Graphics.worldWidth() / Day.phaseLength(clock, World.options)) * clock.position);
	Graphics.moveCelestial(celestial);
}

function announceDusk(changed) {
	if(changed) {
		EventManager.trigger(clock.dusk ? 'duskFall' : 'duskLift');
	}
}

function extendDay(steps) {
	if(!clock.night && celestial != null) {
		var duskChanged = Day.extendDay(clock, World.options, steps);
		moveCelestial();
		announceDusk(duskChanged);
	}
}

function gainWard(amount) {
	var max = GameState.maxWard();
	GameState.ward = Math.min(max, (GameState.ward || 0) + amount);
	EventManager.trigger('wardChanged', [GameState.ward, max]);
}

function harvest(amount) {
	// Gather some of every resource currently on the board
	var gains = {};
	GameBoard.availableTiles().forEach(function(tileChar) {
		var type = Content.getResourceType(tileChar);
		if(type != Content.ResourceType.Mana) {
			gains[type.className] = amount;
		}
	});
	handleTileClear(gains);
}

function phaseTransition() {
	inTransition = true;
	Graphics.phaseTransition(celestial, function() {
		inTransition = false;
	});
	var duskChanged = Day.startPhase(clock, World.options, !clock.night);
	if(!clock.night) {
		// Open all chests
		field.chests.forEach(function(chest) {
			EventManager.trigger('pickupLoot', [FieldView.chest(chest.id), World.getDebugMultiplier()]);
		});
	}
	handleFieldEvents(Field.setNight(field, clock.night));
	if(!clock.night) {
		FieldView.clear();
		field.outsiders = [];
	}
	announceDusk(duskChanged);
	dude.shield = 0;
	dude.sword = 0;
	Graphics.updateShield(0, 0);
	Graphics.updateSword(0, 0);
	
	if(!clock.night) {

		console.log('casual night? ' + casualNight);

		theDragon = null;
		streak++;
		GameState.ward = 0;
		EventManager.trigger('wardChanged', [0, GameState.maxWard()]);
		GameState.dayNumber++;
		GameState.count('NIGHTS', 1);
		GameState.setIfHigher('ROW', streak);
		GameState.save();
		Graphics.notifySave();
		EventManager.trigger('dayBreak', [GameState.dayNumber]);
		if(casualNight) {
			GameState.count('CASUALNIGHTS', 1);
		}
	} else {
		casualNight = Options.get('casualMode', false);
	}
}

function difficultyToggle(casualMode) {
	if(field != null) {
		field.casual = casualMode;
	}
	if(clock.night && casualMode) {
		casualNight = true;
	}
}

function damageAllMonsters(damage) {
	handleFieldEvents(Field.damageAll(field, damage));
	if(theDragon != null && theDragon.isAlive()) {
		theDragon.takeDamage(damage);
	}
}

function wipeMonsters() {
	if(field != null) {
		Field.wipeOut(field);
	}
}

function makeDudeHungry() {
	if(dude != null) {
		dude.takeDamage(1);
	}
}

function healDude(amount) {
	if(dude != null) {
		dude.heal(amount);
	}
}

function hurtDude(amount) {
	if(dude != null) {
		dude.takeDamage(amount);
	}
}

function handleResourceStoreChanged(rows, cols) {
	if(!Resources.loaded) {
		Resources.init();
		launchCelestial();
		GameState.save();
		Graphics.notifySave();
	}
	Resources.setSize(rows, cols);
}

function callDragon() {
	theDragon = MonsterFactory.getMonster("dragon", { 
		flip: dude.p() >= Graphics.worldWidth() / 2, 
		target: dude ,
		multiplier: dragonMultiplier(GameState.prestige)
	});
	stuff.push(theDragon);
	field.outsiders = [{
		id: 0,
		x: function() { return theDragon.p(); },
		width: function() { return theDragon.getHitboxWidth(); },
		// Out of reach while it lands
		alive: function() { return theDragon != null && theDragon.hostile && theDragon.isAlive(); },
		hurt: function(damage) { theDragon.takeDamage(damage); }
	}];
	theDragon.action = ActionFactory.getAction('Land');
	theDragon.action.doAction(theDragon);
	return theDragon;
}

function doDragonAttack(attackName) {
	theDragon.queueAttack(attackName);
}

register('world', World);
export default World;

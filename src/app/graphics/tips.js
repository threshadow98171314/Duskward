import Graphics from './graphics.js';
import WorldGraphics from './world.js';
import BlessingGraphics from './blessings.js';
import GameBoard from '../gameboard.js';
import State from '../gamestate.js';
import Content from '../gamecontent.js';
import Resources from '../resources.js';
import Magic from '../magic.js';
import Plan from '../plan.js';
import Block from '../entity/block.js';
import { harvestResource } from '../../core/harvest.ts';
import { DUSK_MOVES } from '../../core/day.ts';
import { EXPLOSION_DAMAGE } from '../../core/board.ts';
import { Tooltips } from '../../ui/tooltip.ts';

// The tips under the mouse (src/ui/tooltip.ts): what the keeper's status, the
// items, spells and skills, the village, the keeper, the monsters, the sun and the
// tiles on the board are, and what they do. A tile has to be rested on a little
// longer, so that its tip does not come up at every pause in play.

var TILE_DELAY_MS = 1200;

var tips = null;
// What the engine lets the tips ask of the game: the time of day, and what the
// keeper works towards next
var asks = { clock: null, plan: null };

function G() {
	return Graphics;
}

function text() {
	return Graphics.getText.apply(Graphics, arguments);
}

function whole(n) {
	return Math.ceil(n);
}

// Blocks of a material, to a tenth
function blocks(n) {
	return String(Math.round(n * 10) / 10);
}

function resourceName(kind) {
	return text('RESOURCE_NAMES')[kind] || kind;
}

// The numbers the words of an item, spell or skill mention: those of its effects,
// in the order they come, by night before by day
function numbersOf(use) {
	var effects = Array.isArray(use) ? use : use.night.concat(use.day);
	var numbers = [];
	effects.forEach(function(effect) {
		switch(effect.type) {
		case 'heal':
		case 'gainMana':
			numbers.push(Math.round(effect.share * 100));
			break;
		case 'damageAll':
		case 'harvestEach':
			numbers.push(effect.amount);
			break;
		case 'extendDay':
			numbers.push(effect.moves);
			break;
		case 'stateEffect':
			numbers.push(Content.StateEffects[effect.effect].duration / 1000);
			break;
		}
	});
	return numbers;
}

// Words that say what something does, with its numbers filled in
function describe(group, name, def) {
	var numbers = numbersOf(def.use);
	return (text(group)[name] || '').replace(/\{(\d+)\}/g, function(match, i) {
		return numbers[+i];
	});
}

// How much of something out of how much, as the status shows it now
function shown(what) {
	return G().status().shown[what] || null;
}

function healthTip() {
	var health = shown('health');
	return health && { title: text('TIP_HEALTH', whole(health[0]), health[1]), lines: [text('TIP_HEALTH_TEXT')] };
}

// The shield, the sword and the ward are put away while they are empty
function meterTip(what, title, words) {
	var meter = shown(what);
	return meter && meter[0] > 0 ? { title: text(title, whole(meter[0]), meter[1]), lines: [text(words)] } : null;
}

function levelTip() {
	var xp = shown('experience');
	return { title: text('TIP_LEVEL', State.level), lines: xp ? [text('TIP_LEVEL_TEXT', whole(xp[0]), xp[1])] : [] };
}

function itemTip(name) {
	var item = Content.LootType[name];
	return item && { title: text('ITEM_NAMES')[name], lines: [describe('ITEM_TEXTS', name, item)] };
}

function spellTip(name) {
	var spell = Content.Spells[name];
	return spell && { title: text('SPELL_NAMES')[name], lines: [describe('SPELL_TEXTS', name, spell), text('TIP_SPELL_COST', Magic.cost())] };
}

function skillTip(name) {
	var skill = Content.Skills[name];
	return skill && { title: text('SKILL_' + name.toUpperCase()), lines: [describe('SKILL_TEXTS', name, skill)] };
}

function effectTip(className) {
	var name = text('EFFECT_NAMES')[className];
	return name ? { title: name, lines: [text('EFFECT_TEXTS')[className]] } : null;
}

// What a tile does by day and at night, the time it is now first, and what the
// effect on it does
function tileTip(char, effect, night) {
	var type = Content.getResourceType(char);
	if(type == null) {
		return null;
	}
	var day = text('TIP_TILE_DAY', text(type.className == 'grain' ? 'TIP_HEAL' : type.className == 'mana' ? 'TIP_MANA' : 'TIP_STORE'));
	var lines = [day];
	var after = nightEffect(type.className);
	if(after) {
		lines[night ? 'unshift' : 'push'](text('TIP_TILE_NIGHT', after));
	}
	var title = resourceName(type.className);
	if(effect) {
		title = text('TIP_WITH', title, text('TILE_EFFECT_NAMES')[effect.type]);
		lines.push(effect.type == 'explosive' ? text('TIP_EXPLOSIVE', EXPLOSION_DAMAGE, effect.duration) :
			text('TILE_EFFECT_TEXTS')[effect.type]);
	}
	return { title: title, lines: lines };
}

// What gathering a kind of tile at night does, with the buildings the village has
function nightEffect(className) {
	var effect = harvestResource(className, 1, {
		night: true,
		dusk: false,
		inTransition: false,
		boss: null,
		hasBuilding: function(name, current) {
			return State.hasBuilding(Content.getBuildingType(name), current);
		},
		multiplier: 1
	}, Content.getResourceType.bind(Content));
	switch(effect && effect.type) {
	case 'spawn':
		return text('TIP_SPAWN', text('MONSTER_NAMES')[effect.monster]);
	case 'shield':
		return text('TIP_FILL_SHIELD');
	case 'sword':
		return text('TIP_FILL_SWORD');
	case 'dawn':
		return text('TIP_DAWN');
	}
	return null;
}

// A building: what it does; for one yet to be raised, how far along its materials
// are and whether the keeper sees to it first. upgrade is the building that would
// replace it, if a click on it asks for that.
function buildingTip(building, upgrade) {
	var type = building.options.type;
	var name = Plan.buildingName(type.className);
	var does = text('BUILDING_TEXTS')[type.spriteName];
	if(building.built) {
		var lines = does ? [does] : [];
		if(upgrade) {
			lines.push(text(State.prioritizedBuilding == upgrade.options.type.className ? 'TIP_ASKED' : 'TIP_ASK_UPGRADE'));
		}
		return { title: name, lines: lines };
	}
	var plan = asks.plan ? asks.plan() : null;
	var next = plan != null && plan.next == building;
	var bars = next ? plan.bars : Object.keys(type.cost).map(function(kind) {
		return { kind: kind, blocks: type.cost[kind], share: 1 - building.requiredResources[kind] / type.cost[kind], waiting: 0 };
	});
	var needs = bars.map(function(bar) {
		var has = text('TIP_HAS', resourceName(bar.kind), Math.round(bar.share * bar.blocks), bar.blocks);
		var source = bar.share < 1 ? Plan.comesWith(bar.kind) : null;
		return source ? has + text('NEEDS_BUILDING', Plan.buildingName(source)) : has;
	});
	var result = { title: next ? text('TIP_NEXT', name) : name, lines: [needs.join(text('LIST_JOIN'))] };
	var coming = bars.filter(function(bar) {
		return bar.waiting > 0;
	}).map(function(bar) {
		return text('TIP_BLOCKS', resourceName(bar.kind), blocks(bar.waiting * bar.blocks));
	});
	if(coming.length > 0) {
		result.lines.push(text('TIP_COMING', coming.join(text('LIST_JOIN'))));
	}
	if(does) {
		result.lines.push(does);
	}
	result.lines.push(text(State.prioritizedBuilding == type.className ? 'TIP_ASKED' : 'TIP_ASK'));
	return result;
}

function stockpileTip() {
	var kinds = [];
	var amounts = {};
	(State.stores || []).forEach(function(block) {
		var kind = block.options.type.className;
		if(!(kind in amounts)) {
			kinds.push(kind);
			amounts[kind] = 0;
		}
		amounts[kind] += block.quantity() / block.max;
	});
	var held = kinds.map(function(kind) {
		return text('TIP_BLOCKS', resourceName(kind), blocks(amounts[kind]));
	});
	return {
		title: text('TIP_STOCKPILE'),
		lines: [held.length > 0 ? held.join(text('LIST_JOIN')) : text('TIP_STOCKPILE_EMPTY'), text('TIP_STOCKPILE_TEXT', Block.prototype.max, Resources.max())]
	};
}

function clockTip() {
	var clock = asks.clock ? asks.clock() : null;
	if(clock == null) {
		return null;
	} else if(clock.held) {
		return { title: text('TIP_HELD'), lines: [text('TIP_HELD_TEXT')] };
	} else if(clock.night) {
		return { title: text('TIP_NIGHT', clock.left), lines: [text('TIP_NIGHT_TEXT')] };
	} else if(clock.dusk) {
		return { title: text('TIP_DUSK', clock.left), lines: [text('TIP_DUSK_TEXT')] };
	}
	return { title: text('TIP_DAY', clock.left), lines: [text('TIP_DAY_TEXT', DUSK_MOVES)] };
}

function keeperTip() {
	var health = shown('health');
	return { title: text('TIP_KEEPER'), lines: health ? [text('TIP_KEEPER_TEXT', State.level, whole(health[0]), health[1])] : [] };
}

function monsterTip(view) {
	var actor = view.actor;
	return actor ? { title: text('MONSTER_NAMES')[actor.kind] || actor.kind, lines: [text('TIP_MONSTER_TEXT', whole(actor.hp), whole(actor.maxHp))] } : null;
}

// Where a point on the screen is in the world, by the canvas it is over
function inWorld(canvas, clientX, clientY) {
	var rect = canvas.getBoundingClientRect();
	var size = WorldGraphics.village().size;
	if(rect.width == 0 || rect.height == 0) {
		return null;
	}
	return { x: (clientX - rect.left) * size.width / rect.width, y: (clientY - rect.top) * size.height / rect.height };
}

// A tip for an element of the page, told apart from others by the element itself
function on(make) {
	return function(element) {
		var tip = make(element);
		return tip ? { key: element, tip: tip } : null;
	};
}

function found(key, tip, delay) {
	return tip ? { key: key, tip: tip, delay: delay } : null;
}

// In the world, in front first: the keeper and the monsters; the bars of buildings
// and the stockpile; the sun or moon, which the faint outline of the next building
// and the empty corners of the buildings' pictures should not hide; then the buildings
function worldThing(canvas, clientX, clientY) {
	var point = inWorld(canvas, clientX, clientY);
	if(point == null) {
		return null;
	}
	var figure = WorldGraphics.actors().figureAt(point.x, point.y);
	if(figure == 'keeper') {
		return found('keeper', keeperTip());
	} else if(figure != null) {
		return found(figure, monsterTip(figure));
	}
	var village = WorldGraphics.village();
	var thing = village.thingAt(point.x, point.y, false);
	if(thing == null && WorldGraphics.sky().sunAt(point.x, point.y)) {
		return found('sun', clockTip());
	}
	thing = thing || village.thingAt(point.x, point.y);
	if(thing == 'stockpile') {
		return found('stockpile', stockpileTip());
	} else if(thing != null) {
		var asked = village.buildingAt(point.x, point.y);
		return found(thing, buildingTip(thing, asked != null && asked != thing ? asked : null));
	}
	return null;
}

function boardTile(canvas, clientX, clientY) {
	var cell = G().tileAt(clientX, clientY);
	if(cell == null) {
		return null;
	}
	var char = GameBoard.tileAt(cell.row, cell.column);
	var effect = GameBoard.effectAt(cell.row, cell.column);
	var night = document.body.classList.contains('night');
	// A new tile in the same cell is something else to rest on
	var key = ['tile', cell.row, cell.column, char, effect ? effect.type : ''].join(':');
	return found(key, char ? tileTip(char, effect, night) : null, TILE_DELAY_MS);
}

// The parts of the page with tips, the more particular first
function listen(tooltips) {
	tooltips.add('.hearts', on(healthTip));
	tooltips.add('.statusContainer .shield', on(function() {
		return meterTip('shield', 'TIP_SHIELD', 'TIP_SHIELD_TEXT');
	}));
	tooltips.add('.statusContainer .sword', on(function() {
		return meterTip('sword', 'TIP_SWORD', 'TIP_SWORD_TEXT');
	}));
	tooltips.add('.statusContainer .ward', on(function() {
		return meterTip('ward', 'TIP_WARD', 'TIP_WARD_TEXT');
	}));
	tooltips.add('.blessingBadge', on(function() {
		return BlessingGraphics.badgeTip();
	}));
	tooltips.add('.xpBar', on(levelTip));
	tooltips.add('.inventory .button', on(function(button) {
		return itemTip(button.dataset.item);
	}));
	tooltips.add('.spell', on(function(spell) {
		return spellTip(spell.dataset.spell);
	}));
	tooltips.add('.magic .button', on(function() {
		return { title: text('TIP_MAGIC', State.mana || 0, State.maxMana()), lines: [text('TIP_MAGIC_TEXT')] };
	}));
	tooltips.add('.states > div', on(function(icon) {
		return effectTip(icon.classList[0]);
	}));
	tooltips.add('.duskSkills .skill', on(function(skill) {
		return skillTip(skill.dataset.skill);
	}));
	tooltips.add('.duskGauge', on(function() {
		return { title: text('TIP_GAUGE', Math.floor(State.gauge || 0), State.maxGauge()), lines: [text('TIP_GAUGE_TEXT')] };
	}));
	tooltips.add('.villageCanvas', worldThing);
	tooltips.add('.boardCanvas', boardTile);
}

export default {
	// Options: clock and plan, which ask the game the time of day and what the keeper
	// works towards next
	init: function(opts) {
		asks.clock = (opts && opts.clock) || null;
		asks.plan = (opts && opts.plan) || null;
		if(tips == null) {
			tips = new Tooltips(document.body);
			listen(tips);
		}
		tips.hide();
	},

	// The tip on screen, if there is one
	showing: function() {
		return tips ? tips.showing() : null;
	},

	numbersOf: numbersOf,
	tileTip: tileTip,
	buildingTip: buildingTip,
	stockpileTip: stockpileTip,
	clockTip: clockTip
};

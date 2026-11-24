import Graphics from './graphics/graphics.js';
import WorldGraphics from './graphics/world.js';
import FieldMonster from './entity/monster/fieldmonster.js';
import TreasureChest from './entity/loot/treasurechest.js';
import { carrying } from '../core/field.ts';

// Draws the field (src/core/field.ts) after every tick: the keeper, the monsters and
// the chests, where the field has them and in the frame of whatever they are doing,
// and the dragon's fires and ice (src/render/actors.ts draws them). Sprite rows follow the original sheets: idle,
// walk right, walk left, attack right, attack left, die facing right, die facing
// left, then rows of their own (the keeper's climb, hammer, carry and loot; the
// lich's spell). The views of monsters and chests keep what the rest of the game
// needs of them, such as where their loot drops.

// Chests keep clear of the edges of the world
var CHEST_EDGE = 20;

var keeper = null;
var monsters = {};
var chests = {};

function actors() {
	return WorldGraphics.actors();
}

function keeperRow(field) {
	var actor = field.keeper;
	var right = actor.facing == 'right';
	switch(actor.activity.type) {
	case 'move':
		return right ? (carrying(field) ? 9 : 1) : 2;
	case 'strike':
		// Without a sword, the keeper swings a fist
		return (right ? 3 : 4) + (keeper.hasSword() ? 0 : 8);
	case 'die':
		return right ? 5 : 6;
	case 'climb':
		return 7;
	case 'hammer':
		return 8;
	case 'open':
		return 10;
	default:
		return 0;
	}
}

function monsterRow(actor) {
	var right = actor.facing == 'right';
	switch(actor.activity.type) {
	case 'strike':
	case 'shoot':
		return right ? 3 : 4;
	case 'die':
		return right ? 5 : 6;
	case 'cast':
		return right ? 7 : 8;
	default:
		// Monsters have no idle animation; they keep walking on the spot
		return right ? 1 : 2;
	}
}

export default {
	init: function(keeperView) {
		keeper = keeperView;
		monsters = {};
		chests = {};
		actors().clear();
	},

	addMonster: function(actor) {
		var view = new FieldMonster(actor);
		view.p(actor.x);
		actors().addMonster(view, actor.def.sprite, actor.x, !!actor.def.flying);
		monsters[actor.id] = view;
		return view;
	},

	monster: function(id) {
		return monsters[id];
	},

	// Leaves the body where it fell for a while
	bury: function(id) {
		var view = monsters[id];
		delete monsters[id];
		if(view) {
			actors().buryMonster(view);
		}
	},

	addChest: function(chest, forceLoot) {
		var view = new TreasureChest({ forceLoot: forceLoot });
		view.p(Math.min(Graphics.worldWidth() - CHEST_EDGE, Math.max(CHEST_EDGE, chest.x)));
		actors().addChest(view, view.p());
		chests[chest.id] = view;
		return view;
	},

	chest: function(id) {
		return chests[id];
	},

	// Daybreak: monsters and chests are gone
	clear: function() {
		monsters = {};
		chests = {};
		actors().clear();
	},

	shoot: function(projectile) {
		actors().shoot(projectile.kind, projectile.from, projectile.to);
	},

	draw: function(field) {
		var actor = field.keeper;
		keeper.p(actor.x);
		keeper.facing = actor.facing;
		var block = keeper.carrying;
		actors().setKeeper({ x: actor.x, row: keeperRow(field), frame: actor.frame },
			block ? { kind: block.options.type.className, fill: block.quantity() / block.max } : null);

		field.monsters.forEach(function(monster) {
			var view = monsters[monster.id];
			if(!view) {
				return;
			}
			view.p(monster.x);
			actors().updateMonster(view, { x: monster.x, row: monsterRow(monster), frame: monster.frame },
				monster.hp / monster.maxHp, monster.hidden);
		});

		actors().fires = field.fires.map(function(fire) {
			return fire.x;
		});
		actors().frozen = field.keeperFrozen;
	}
};

import Graphics from './graphics/graphics.js';
import FieldMonster from './entity/monster/fieldmonster.js';
import TreasureChest from './entity/loot/treasurechest.js';
import Projectile from './entity/projectile.js';
import { carrying, TICK_MS } from '../core/field.ts';

// Draws the field (src/core/field.ts) after every tick: moves the keeper, monsters
// and chests to where the field has them, and shows the frame of whatever they are
// doing. Sprite rows follow the original sheets: idle, walk right, walk left,
// attack right, attack left, die facing right, die facing left, then rows of
// their own (the keeper's climb, hammer, carry and loot; the lich's spell).

var CORPSE_DECAY_TIME = 5000;
// Further than this in one tick, the field moved someone without walking them
var JUMP = 60;

var keeper = null;
var monsters = {};
var chests = {};

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

function show(view, row, frame) {
	if(view.animationRow !== row || view.frame !== frame) {
		view.animationRow = row;
		view.frame = frame;
		view.tempAnimation = null;
		Graphics.updateSprite(view);
	}
}

// Glides the view to where the field has it, arriving as the next tick comes
function moveTo(view, x) {
	// A glide that has not finished (the page was not drawing) catches up first
	if(view.fieldX != null && view.p() !== view.fieldX) {
		Graphics.stop(view);
		view.p(view.fieldX);
		Graphics.setPosition(view, view.fieldX);
	}
	view.fieldX = x;
	var distance = Math.abs(x - view.p());
	if(distance > JUMP) {
		Graphics.stop(view);
		view.p(x);
		Graphics.setPosition(view, x);
	} else if(distance > 0) {
		Graphics.animateMove(view, x, null, null, TICK_MS / distance);
	}
}

function bobHeldBlock(frame) {
	if(frame == 1) {
		keeper.held.css({transform: 'translate3d(0px, 1px, 0px)'});
	} else if(frame == 3) {
		keeper.held.css({transform: 'translate3d(0px, -1px, 0px)'});
	} else {
		keeper.held[0].style = '';
	}
}

function remove(view) {
	Graphics.stop(view);
	view.el().remove();
}

export default {
	init: function(keeperView) {
		keeper = keeperView;
		monsters = {};
		chests = {};
	},

	addMonster: function(actor) {
		var view = new FieldMonster(actor);
		Graphics.addMonster(view, actor.facing == 'right' ? 'left' : 'right');
		view.p(actor.x);
		Graphics.setPosition(view, actor.x);
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
			setTimeout(function() {
				view.el().addClass('hidden');
				setTimeout(function() {
					view.el().remove();
				}, 200);
			}, CORPSE_DECAY_TIME);
		}
	},

	addChest: function(chest, forceLoot) {
		var view = new TreasureChest({ forceLoot: forceLoot });
		view.p(chest.x);
		Graphics.addToWorld(view);
		Graphics.setPosition(view, chest.x);
		chests[chest.id] = view;
		return view;
	},

	chest: function(id) {
		return chests[id];
	},

	// Daybreak: monsters and chests are gone
	clear: function() {
		for(var id in monsters) {
			remove(monsters[id]);
		}
		for(var c in chests) {
			remove(chests[c]);
		}
		monsters = {};
		chests = {};
	},

	shoot: function(projectile) {
		Graphics.fireArrow(new Projectile({
			projectileClass: projectile.kind == 'fireball' ? 'arrow fireball' : 'arrow',
			fireFrom: projectile.from,
			fireTo: projectile.to
		}));
	},

	draw: function(field) {
		var actor = field.keeper;
		moveTo(keeper, actor.x);
		show(keeper, keeperRow(field), actor.frame);
		if(keeper.carrying != null) {
			bobHeldBlock(actor.frame);
		}

		field.monsters.forEach(function(monster) {
			var view = monsters[monster.id];
			if(!view) {
				return;
			}
			moveTo(view, monster.x);
			show(view, monsterRow(monster), monster.frame);
			if(view.hp() !== monster.hp) {
				view.hp(monster.hp);
			}
			view.el().toggleClass('hidden', monster.hidden);
		});
	}
};

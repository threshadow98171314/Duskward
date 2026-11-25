import Util from '../../util.js';
import Monster from './monster.js';

// A monster on the field, as the rest of the game knows it: its loot and what it
// is worth. Where it is and what it does is up to the field (src/core/field.ts),
// from its content entry; src/render/actors.ts draws it.
var FieldMonster = function(actor) {
	this.options = Util.extend({}, this.options, {
		monsterClass: actor.kind,
		spriteName: actor.def.sprite,
		tiles: actor.tiles
	});
	this.actor = actor;
	this.dropChance = actor.def.dropChance;
	this.hp(actor.hp);
};
FieldMonster.prototype = new Monster({});
FieldMonster.constructor = FieldMonster;

FieldMonster.prototype.getMaxHealth = function() {
	return this.actor ? this.actor.maxHp : 1;
};

FieldMonster.prototype.getXp = function() {
	return this.actor.xp;
};

FieldMonster.prototype.getLoot = function() {
	return this.actor.def.loot || null;
};

export default FieldMonster;

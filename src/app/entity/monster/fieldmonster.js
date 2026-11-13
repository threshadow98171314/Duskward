import $ from '../../../vendor/jquery.js';
import Monster from './monster.js';

// What a monster on the field looks like: its sprite and health bar. Where it is
// and what it does is up to the field (src/core/field.ts), from its content entry.
var FieldMonster = function(actor) {
	this.options = $.extend({}, this.options, {
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

FieldMonster.prototype.el = function() {
	if(this._el == null) {
		Monster.prototype.el.call(this).toggleClass('flying', !!this.actor.def.flying);
	}
	return this._el;
};

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

import $ from '../../../vendor/jquery.js';
import WorldEntity from '../worldentity.js';
import Graphics from '../../graphics/graphics.js';
import Options from '../../gameoptions.js';
import { monsterStat } from '../../../core/combat.ts';

var Monster = function(options) {
	this.options = $.extend({ multiplier: 1 }, this.options, options);
	this.hostile = true;
	this.action = null;
	this.noIdle = true;
};
Monster.prototype = new WorldEntity({
	className: 'monster'
});

Monster.prototype.el = function() {
	if(this._el == null) {
		this._el = WorldEntity.prototype.el.call(this)
			.addClass(this.options.monsterClass)
			.append(Graphics.make('healthBar').append(Graphics.make()));
	}
	return this._el;
};

Monster.prototype.makeIdle = function() {
	// Nothing. Monsters have no idle animation.
};

Monster.prototype.forceDrop = false;

Monster.prototype.getLoot = function() {
	// Trigger default loot rolls in most cases
	return null;
};

Monster.prototype.getMaxHealth = function() {
	return monsterStat(this.maxHealth, this.options.multiplier, Options.get('casualMode', false));
};

Monster.prototype.getDamage = function() {
	return monsterStat(this.damage, this.options.multiplier, Options.get('casualMode', false));
};

Monster.prototype.getXp = function() {
	return this.xp;
};

Monster.prototype.speed = function() {
	// Hack to speed everything up a bit.
	return this.options.speed / 2;
}

Monster.constructor = Monster;

export default Monster;

import $ from '../../../vendor/jquery.js';
import Monster from './monster.js';
import ActionFactory from '../../action/actionfactory.js';
import World from '../../world.js';

var HauntedArmour = function(options) {
	this.options = $.extend({}, this.options, {}, options);
	
	this.maxHealth = 7; // 3 hits with a sword, 7 hits without
	this.damage = 1; // between 2 and 6 damage
	this.xp = 10;
	
	this.hp(this.getMaxHealth());
};
HauntedArmour.prototype = new Monster({
	monsterClass: 'hauntedArmour',
	spriteName: 'harmour',
	speed: 80
});
HauntedArmour.constructor = HauntedArmour;

HauntedArmour.prototype.think = function() {
	var _this = this;
	if(_this.isIdle() && _this.isAlive() && _this.action == null) {
		if(!_this.attackRange(World.getDude())) {
			_this.action = ActionFactory.getAction("MoveTo", {
				target: World.getDude()
			});
		} else {
			_this.action = ActionFactory.getAction("Attack", {
				target: World.getDude()
			});
		}
		if(_this.action != null) {
			_this.action.doAction(_this);
			return true;
		}
	}
	return false;
};

HauntedArmour.prototype.hasSword = function() {
	return true;
};

HauntedArmour.prototype.getHitboxWidth = function() {
	return 20;
};

export default HauntedArmour;

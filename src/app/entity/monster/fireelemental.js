import $ from '../../../vendor/jquery.js';
import Monster from './monster.js';
import ActionFactory from '../../action/actionfactory.js';
import Graphics from '../../graphics/graphics.js';
import World from '../../world.js';

var FireElemental = function(options) {
	this.options = $.extend({}, this.options, {}, options);
	
	this.damage = 4; // Between 4 and 24 damage
	this.maxHealth = 12; // 2 hits with sword, 6 without
	this.xp = 27;
	
	this.hp(this.getMaxHealth());
};
FireElemental.prototype = new Monster({
	monsterClass: 'fireElemental',
	spriteName: 'fireelemental',
	arrowClass: 'arrow fireball',
	speed: 50,
	arrowSpeed: 7,
	fire: true
});
FireElemental.constructor = FireElemental;

FireElemental.prototype.think = function() {
	var _this = this;
	if(_this.isIdle() && _this.isAlive() && _this.action == null) {
		if(!_this.attackRange(World.getDude())) {
			_this.action = ActionFactory.getAction("MoveTo", {
				target: World.getDude()
			});
		} else {
			_this.action = ActionFactory.getAction("Shoot", {
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

FireElemental.prototype.attackRange = function(target) {
	// Fire Elementals are ranged
	return this.p() > 10 && this.p() < Graphics.worldWidth() - 10 && 
		Math.abs(this.p() - target.p()) <= 200;
};

export default FireElemental;

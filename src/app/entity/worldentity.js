import $ from '../../vendor/jquery.js';
import Entity from './entity.js';
import EventManager from '../eventmanager.js';

var MOVE_ANIMS = {
	idle: 0,
	right: 1,
	left: 2,
	attackLeft: 3,
	attackRight: 4
};

var worldEntity = function(options) {
	this.options = $.extend({}, this.options, {
		// Nuthin'
	}, options);
	this.hp(this.getMaxHealth());
	this.gone = false;
};
worldEntity.prototype = new Entity();
worldEntity.constructor = worldEntity;

worldEntity.prototype.hp = function(value) {
	if(value != null) {
		this._hp = value;
		EventManager.trigger('healthChanged', [this]);
	}
	return this._hp;
};

worldEntity.prototype.getAnimation = function(label) {
	return MOVE_ANIMS[label];
};

worldEntity.prototype.think = function() {
	// Nothing
	return false;
};

worldEntity.prototype.makeIdle = function() {
	this.animation(MOVE_ANIMS.idle);
};

worldEntity.prototype.isIdle = function() {
	return this.action == null;
};

worldEntity.prototype.attackRange = function(target) {
	return Math.abs(this.p() - target.p()) <= (this.getHitboxWidth() / 2) + (target.getHitboxWidth() / 2);
};

worldEntity.prototype.distanceFrom = function(target) {
	if(Math.abs(this.p() - target.p()) < (this.getHitboxWidth() + target.getHitboxWidth()) / 2) return 0;
	return Math.abs(Math.abs(this.p() - target.p()) - this.getHitboxWidth() / 2 - target.getHitboxWidth() / 2);
};

worldEntity.prototype.getMaxHealth = function() {
	return 0;
};

worldEntity.prototype.getDamage = function() {
	return 0;
};

worldEntity.prototype.takeDamage = function(damage) {
	if(this.isAlive()) {
		this.hp(this.hp() - damage);
		if(this.hp() <= 0) {
			this.die();
		}
	}
};

worldEntity.prototype.die = function() {
	// Entities that can die say how (the dragon); the rest just stop
	if(this.action != null) {
		this.action.terminateAction(this);
	}
};

worldEntity.prototype.isAlive = function() {
	return this.hp() > 0;
};

worldEntity.prototype.getHitboxWidth = function() {
	return this.width();
};

worldEntity.prototype.hasSword = function() {
	return false;
};

export default worldEntity;

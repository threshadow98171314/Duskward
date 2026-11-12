import Action from './action.js';
import EventManager from '../eventmanager.js';
import World from '../world.js';

var GetLoot = function(options) {
	this.target = options.target;
};
GetLoot.prototype = new Action();
GetLoot.constructor = GetLoot;

GetLoot.prototype.doAction = function(entity) {
	this._entity = entity;
	entity.animationOnce(10);
};

GetLoot.prototype.doFrameAction = function(frame) {
	if(frame == 3) {
		EventManager.trigger('pickupLoot', [this.target, World.getDebugMultiplier()]);
		this._entity.action = null;
		this._entity.paused = true;
		var _e = this._entity;
		setTimeout(function() {
			_e.paused = false;
		}, 1500);
	}
};

GetLoot.prototype.terminateAction = function(entity) {
	Action.prototype.terminateAction.call(this, entity);
	entity.paused = false;
};

export default GetLoot;

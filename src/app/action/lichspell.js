import Action from './action.js';
import GameBoard from '../gameboard.js';
import EventManager from '../eventmanager.js';

var LichSpell = function(options) {
	if(options) {
		this.target = options.target;
	}
};
LichSpell.prototype = new Action();
LichSpell.constructor = LichSpell;

LichSpell.prototype.doAction = function(entity) {
	this._entity = entity;
	var animation;
	if(entity.p() < this.target.p()) {
		animation = 7;
		this.lastDir = "right";
	} else {
		animation = 8;
		this.lastDir = "left";
	}
	entity.animationOnce(animation);
};

LichSpell.prototype.doFrameAction = function(frame) {
	if(frame == 3) {
		GameBoard.addEffectRandomly('explosive');
		EventManager.trigger('lichSpell');
		this._entity.action = null;
	}
};

export default LichSpell;

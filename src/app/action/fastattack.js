import Attack from './attack.js';
import EventManager from '../eventmanager.js';

var FastAttack = function(options) {
	this.target = options.target;
};
FastAttack.prototype = new Attack();
FastAttack.constructor = FastAttack;

FastAttack.prototype.doFrameAction = function(frame) {
	if(frame == 1 || frame == 3) {
		this.target.takeDamage(this._entity.getDamage(), this._entity);
		EventManager.trigger(this._entity.hasSword() ? 'sharpHit' : 'bluntHit');
	}
	if(frame == 3) {
		this._entity.action = null;
	}
};

export default FastAttack;

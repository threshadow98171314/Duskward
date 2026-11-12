import Action from '../action.js';
import Graphics from '../../graphics/graphics.js';
import E from '../../eventmanager.js';
import C from '../../gamecontent.js';

var IceBeam = function(options) {
	if(options) {
		this.target = options.target;
	}
};
IceBeam.prototype = new Action();
IceBeam.constructor = IceBeam;

IceBeam.prototype.doAction = function(entity) {
	var beam = Graphics.make('iceBeam');
	entity.setPosture('aimClose', 100);
	var _this = this;
	this.timeout = setTimeout(function() {
		entity.setPosture('aimOpen', 500);
		entity.getHead().append(beam);
		E.trigger('charge');
		setTimeout(function() {
			E.trigger('newStateEffect', [C.StateEffects.frozen]);
			E.trigger('ice');
		}, 800);
		setTimeout(function() {
			beam.remove();
			if(!_this.terminated) { entity.action = null; }
		}, 1000);
	}, 100);
};

IceBeam.prototype.terminateAction = function(entity) {
	this.terminated = true;
	clearTimeout(this.timeout);
	Action.prototype.terminateAction.call(this, entity);
};

export default IceBeam;

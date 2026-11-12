import Action from './action.js';
import G from '../graphics/graphics.js';

var Slide = function(options) {
	this.flipped = options && options.flipped;
};
Slide.prototype = new Action();
Slide.constructor = Slide;

Slide.prototype.doAction = function(entity) {
	var newPos = entity.p() + (this.flipped ? 150 : -150);
	if(newPos > G.worldWidth() - 10) newPos = G.worldWidth() - 10;
	if(newPos < 10) newPos = 10;
	G.animateMove(
		entity,
		newPos,
		function() {
			entity.action = null;
		},
		null,
		1
	);
};

Slide.prototype.terminateAction = function(entity, force) {
	if(force) {
		Action.prototype.terminateAction.call(this);
	}
};

export default Slide;

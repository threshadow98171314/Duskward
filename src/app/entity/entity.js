import $ from '../../vendor/jquery.js';

// Something in the world that animates. The views under src/render draw it; this
// keeps the frame and row of its animation, and lets an animation do something on
// each of its frames.
var entity = function(options) {
	
	this.options = $.extend({
		className: "blank",
		animationFrames: 4,
		speed: 40
	}, options);
	
	this.frame = 0;
	this.animationRow = 0;
	this.tempAnimation = null;
	this.stepFunction = null;
};

entity.prototype.guid = function() {
	if(!this._guid) {
		this._guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		    return v.toString(16);
		});
	}
	return this._guid;
};

/**
 * Gets or sets the position
 */
entity.prototype.p = function(param) {
	if (param != null) {
		this._position = param;
	}
	return this._position;
};

// The next frame; a one-off animation gives way to the usual one once it is over
entity.prototype.animate = function() {
	if(++this.frame >= this.options.animationFrames) {
		this.frame = 0;
		if(this.tempAnimation != null) {
			this.tempAnimation = null;
			this.stepFunction = null;
		}
	}
	this.step();
};

// Whatever goes with the animation happens on its frame
entity.prototype.step = function() {
	if(this.stepFunction) {
		this.stepFunction(this.frame);
	}
};

entity.prototype.animation = function(row, stopTempAnimations, stepFunction) {
	if(stopTempAnimations) {
		this.tempAnimation = null;
		this.stepFunction = null;
	}
	if(stepFunction) {
		this.stepFunction = stepFunction;
	}
	this.animationRow = row;
	this.frame = 0;
	this.step();
};

entity.prototype.animationOnce = function(row, stepFunction) {
	this.tempAnimation = row;
	this.frame = 0;
	this.stepFunction = stepFunction || null;
	this.step();
};

entity.prototype.speed = function() {
	return this.options.speed;
};

export default entity;

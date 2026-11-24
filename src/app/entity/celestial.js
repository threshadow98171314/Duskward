import { getModule } from '../modules.js';

// The sun by day and the moon by night. It is drawn in the sky (src/render/sky.ts);
// this keeps its place along the day, and its frame as it shimmers, like the other
// things in the world that animate.

var FRAMES = 4;

var Celestial = function() {
	this.frame = 0;
	this.animationRow = 0;
	this.gone = false;
	this._position = 0;
};

Celestial.prototype.p = function(position) {
	if(position != null) {
		this._position = position;
	}
	return this._position;
};

Celestial.prototype.think = function() {
	return false;
};

Celestial.prototype.animate = function() {
	this.frame = (this.frame + 1) % FRAMES;
	getModule('graphics/graphics').updateSun(this);
};

// 0 shows the sun, 1 the moon
Celestial.prototype.animation = function(row) {
	this.animationRow = row;
	this.frame = 0;
	getModule('graphics/graphics').updateSun(this);
};

export default Celestial;

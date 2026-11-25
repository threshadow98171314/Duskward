// The sun by day and the moon by night. It is drawn in the sky (src/render/sky.ts);
// this keeps its place along the day, and its frame as it shimmers, like the other
// things in the world that animate, and shows each change with the given function.

var FRAMES = 4;

var Celestial = function(show) {
	this.show = show || function() {};
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
	this.show(this);
};

// 0 shows the sun, 1 the moon
Celestial.prototype.animation = function(row) {
	this.animationRow = row;
	this.frame = 0;
	this.show(this);
};

export default Celestial;

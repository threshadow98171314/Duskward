import Util from '../../util.js';

// A chest left on the field. It is drawn by src/render/actors.ts; this keeps what
// the game needs of it: where it lies, and any loot it was made to hold.
var TreasureChest = function(options) {
	this.options = Util.extend({}, options);
	this.lootable = true;
	this._position = 0;
};

TreasureChest.prototype.p = function(position) {
	if(position != null) {
		this._position = position;
	}
	return this._position;
};

export default TreasureChest;

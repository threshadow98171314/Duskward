import Util from '../util.js';
import WorldEntity from './worldentity.js';
import Content from '../gamecontent.js';

// A block of one kind of material, filling up as the board yields it. Full blocks
// wait in the stockpile (src/render/village.ts draws it) for the keeper to carry them.

var Block = function(options) {
	this.options = Util.extend({}, this.options, {
		type: Content.ResourceType.Grain
	}, options);
	this._quantity = 0;
};
Block.prototype = new WorldEntity({
	className: 'block'
});
Block.constructor = Block;

Block.makeBlock = function(savedBlock) {
	var block = new Block(savedBlock.options);
	block._quantity = savedBlock._quantity;
	
	return block;
};

Block.prototype.max = 30;

Block.prototype.spaceLeft = function() {
	return this.max - this._quantity;
};

Block.prototype.quantity = function(value) {
	if(value != null) {
		this._quantity = value > this.max ? this.max : value;
	}
	return this._quantity;
};

export default Block;

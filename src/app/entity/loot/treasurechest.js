import $ from '../../../vendor/jquery.js';
import WorldEntity from '../worldentity.js';

var TreasureChest = function(options) {
	this.options = $.extend({}, this.options, {}, options);
	this.lootable = true;
};
TreasureChest.prototype = new WorldEntity({
	className: 'treasureChest nightSprite',
	spriteName: 'treasurechest',
	animationFrames: 0
});
TreasureChest.constructor = TreasureChest;

export default TreasureChest;

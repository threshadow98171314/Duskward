import WorldEntity from './worldentity.js';

var Gem = function() { };
Gem.prototype = new WorldEntity({
	className: 'gem',
	spriteName: 'gem'
});
Gem.constructor = Gem;

export default Gem;

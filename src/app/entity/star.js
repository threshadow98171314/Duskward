import WorldEntity from './worldentity.js';

var Star = function() { };
Star.prototype = new WorldEntity({
	className: 'star',
	spriteName: 'star'
});
Star.constructor = Star;

export default Star;

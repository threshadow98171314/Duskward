import WorldEntity from './worldentity.js';

var celestial = function() { };
celestial.prototype = new WorldEntity({
	className: 'celestial',
	spriteName: 'sun'
});
celestial.constructor = celestial;

export default celestial;

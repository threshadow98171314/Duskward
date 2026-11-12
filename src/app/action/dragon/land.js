import Action from '../action.js';
import Graphics from '../../graphics/graphics.js';

var Land = function() {};
Land.prototype = new Action();
Land.constructor = Land;

Land.prototype.doAction = function(entity) {
	entity.hostile = false;
	Graphics.landDragon(entity, function() {
		entity.hostile = true;
		entity.action = null;
	});
};

export default Land;

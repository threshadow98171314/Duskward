import Action from './action.js';
import Content from '../gamecontent.js';
import World from '../world.js';
import Graphics from '../graphics/graphics.js';
import E from '../eventmanager.js';
import State from '../gamestate.js';

var RaiseBuilding = function(options) {
	this.building = options.building;
	this.hammering = false;
};
RaiseBuilding.prototype = new Action();
RaiseBuilding.constructor = RaiseBuilding;

RaiseBuilding.prototype.doAction = function(dude) {
	var _action = this;
	dude.move(this.building.dudeSpot(), function(dude) {
		dude.animation(8);
		_action.hammering = true;
		Graphics.raiseBuilding(_action.building, function() {
			_action.building.built = true;
			E.trigger('buildingComplete', [_action.building]);
			dude.makeIdle();
			dude.action = null;
			var cb = Content.BuildingCallbacks[_action.building.options.type.className];
			if(cb) {
				cb();
			}
			// Remove replaced building, if necessary
			if(_action.building.options.type.replaces != null) {
				replaces = _action.building.getReplaces(State);
				World.removeBuilding(replaces);
			}
		});
	});
};

RaiseBuilding.prototype.doFrameAction = function(frame) {
	if(this.hammering && frame == 3) {
		E.trigger('bluntHit');
	}
};

RaiseBuilding.prototype.terminateAction = function(dude) {
	var _action = this;
	
	// RequireJS ran asynchronous require() callbacks on a 4 ms timeout; keep that timing
	setTimeout(function() {
		Graphics.stop(dude);
		dude.makeIdle();
		dude.action = null;
		Graphics.sinkBuilding(_action.building);
	}, 4);
};

export default RaiseBuilding;

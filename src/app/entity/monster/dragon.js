import Util from '../../util.js';
import Monster from './monster.js';
import G from '../../graphics/graphics.js';
import WorldGraphics from '../../graphics/world.js';
import EventManager from '../../eventmanager.js';
import { DragonView } from '../../../render/dragon.ts';

var THRASH_SPEED = 400;
// Fire bursts this high off the ground, where the keeper stands
var BURST_HEIGHT = 25;

// A burst of fire on the ground
function boom(x) {
	G.effects().flash(x, G.worldHeight() - BURST_HEIGHT, 5, 30, 400);
}

// The Fallen Dawnwyrm as the rest of the game knows it: its health, and the show of
// each of its strikes. What it does and when is up to the field (src/core/field.ts);
// src/render/dragon.ts draws it, and the effects (src/render/effects.ts) what it
// shoots and the flashes of what blows apart.
var Dragon = function(options) {
	this.options = Util.extend({}, this.options, {}, options);
	this.boss = this.options.boss;
	this.timers = [];

	this.hp(this.getMaxHealth());
	this.target = this.options.target;
	this.isBoss = true;
	this.view = new DragonView(this.boss ? this.boss.x : 0, !!this.options.flip, G.worldHeight());
};
Dragon.prototype = new Monster({
	monsterClass: 'dragon',
	spriteName: 'dragon',
	speed: 80,
	animationFrames: 4
});
Dragon.constructor = Dragon;

// The body moves on a frame every step, and the jaws with it
Dragon.prototype.animate = function() {
	if(++this.frame >= this.options.animationFrames) {
		this.frame = 0;
		if(this.tempAnimation != null) {
			this.tempAnimation = null;
			this.stepFunction = null;
		}
	}
	this.show();
	this.view.stepJaw();
};

// Shows the frame the body is in, and does whatever goes with it
Dragon.prototype.show = function() {
	this.view.setBody((this.tempAnimation == null ? this.animationRow : this.tempAnimation) || 0, this.frame);
	if(this.stepFunction) {
		this.stepFunction(this.frame);
	}
};

Dragon.prototype.animation = function(row, stopTempAnimations, stepFunction) {
	if(stopTempAnimations) {
		this.tempAnimation = null;
		this.stepFunction = null;
	}
	if(stepFunction) {
		this.stepFunction = stepFunction;
	}
	this.animationRow = row;
	this.frame = 0;
	this.show();
};

Dragon.prototype.animationOnce = function(row, stepFunction) {
	this.tempAnimation = row;
	this.frame = 0;
	this.stepFunction = stepFunction || null;
	this.show();
};

// Where the neck meets the body, as it moves with the wings; nothing puts it back
Dragon.prototype.setNeckMount = function(pos) {
	this.view.mountAt(pos || null);
};

// Eases into a posture (at once without a speed), turning its head to the keeper
// where the posture says so
Dragon.prototype.setPosture = function(name, speed) {
	this.view.pose(name, speed || 0, this.target ? this.target.p() : this.view.x);
};

// Shows up high in the sky, and comes down onto the field in its own time
Dragon.prototype.comeDown = function(height, duration) {
	this.view.fly(height);
	this.view.descend(duration);
	WorldGraphics.actors().boss = this.view;
};

// Takes it off the field: whatever it was doing stops, and it is no longer drawn
Dragon.prototype.remove = function() {
	this.cancel();
	var actors = WorldGraphics.actors();
	if(actors.boss === this.view) {
		actors.boss = null;
	}
};

Dragon.prototype.getMaxHealth = function() {
	return this.boss ? this.boss.maxHp : 1;
};

Dragon.prototype.later = function(callback, delay) {
	this.timers.push(setTimeout(callback, delay));
};

// Stops every show in progress, e.g. when day breaks mid-fight
Dragon.prototype.cancel = function() {
	this.timers.forEach(clearTimeout);
	this.timers = [];
};

// A strike begins
Dragon.prototype.strike = function(name, targetX) {
	var _this = this;
	var view = this.view;
	var ground = G.worldHeight() - BURST_HEIGHT;
	switch(name) {
	case 'fireball':
		this.setPosture('aim', 500);
		this.later(function() {
			_this.setPosture('shoot', 200);
			G.effects().bolt('fireball', view.mouth(), { x: targetX, y: ground }, 300);
			EventManager.trigger('shootFire');
		}, 500);
		break;
	case 'bite':
		this.setPosture('aimbite', 600);
		this.later(function() {
			_this.setPosture('bite', 200);
		}, 600);
		break;
	case 'iceBeam':
	case 'fireBlast':
		this.setPosture('aimClose', 100);
		this.later(function() {
			// Its breath gathers in its mouth, then goes out at the keeper
			var mouth = view.mouth();
			view.breathe(name == 'fireBlast' ? 'fire' : 'ice', Math.hypot(targetX - mouth.x, ground - mouth.y));
			_this.setPosture('aimOpen', 500);
			EventManager.trigger('charge');
		}, 100);
		break;
	case 'wingBuffet':
		this.animationOnce(3, function(frame) {
			_this.setNeckMount([{ x: 25, y: 105 }, { x: 37, y: 65 }, { x: 65, y: 46 }, { x: 65, y: 46 }][frame]);
		});
		this.later(function() {
			_this.animationOnce(4, function(frame) {
				_this.setNeckMount([{ x: 65, y: 70 }, { x: 30, y: 80 }, null, { x: 25, y: 105 }][frame]);
			});
		}, 800);
		this.later(function() {
			_this.setNeckMount();
		}, 1600);
		break;
	}
};

// A strike lands where the keeper is now
Dragon.prototype.land = function(name, targetX, hit) {
	var view = this.view;
	switch(name) {
	case 'fireball':
		boom(targetX);
		EventManager.trigger('explodeFire');
		break;
	case 'bite':
		if(hit) {
			EventManager.trigger('sharpHit');
		}
		break;
	case 'iceBeam':
		EventManager.trigger('ice');
		this.later(function() {
			view.stopBreath();
		}, 200);
		break;
	case 'fireBlast':
		view.stopBreath();
		boom(targetX);
		break;
	case 'wingBuffet':
		EventManager.trigger('flap');
		break;
	}
};

// Thrashes, then comes apart a piece at a time
Dragon.prototype.dying = function() {
	var _this = this;
	var dir = 'up';
	(function thrash() {
		if(_this.exploding) {
			return;
		}
		_this.setPosture('thrash' + dir, THRASH_SPEED);
		dir = dir == 'up' ? 'down' : 'up';
		_this.later(thrash, THRASH_SPEED);
	})();
	this.later(function() {
		_this.exploding = true;
		_this.explode(800);
	}, 1500);
};

// The head, then each segment of the neck down to the body, blow apart one after
// another; then the body bursts, and it is gone
Dragon.prototype.explode = function(delay) {
	var _this = this;
	var view = this.view;
	var segment = 3;
	(function blowApart() {
		var at = view.explode(segment);
		G.effects().flash(at.x, at.y, 5, 40, 400);
		EventManager.trigger('segmentExplode');
		if(segment-- > 0) {
			_this.later(blowApart, delay);
			return;
		}
		_this.later(function() {
			EventManager.trigger('dragonExplode');
			var burst = view.vanish();
			G.effects().flash(burst.x, burst.y, 5, 200, 2000);
			_this.later(function() {
				_this.remove();
				_this.dead = true;
				_this.action = null;
				_this.gone = true;
			}, 2000);
		}, delay);
	})();
};

export default Dragon;

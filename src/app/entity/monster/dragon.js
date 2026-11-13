import $ from '../../../vendor/jquery.js';
import Monster from './monster.js';
import G from '../../graphics/graphics.js';
import Sprites from '../../graphics/sprites.js';
import EventManager from '../../eventmanager.js';

var ANIMATION_ROWS = 5;
var THRASH_SPEED = 400;

var postureSpeedStylesheet = null;
var headMount = { x: 20, y: 97 };
var posture = {
	stretch: ['close', [0, -10], [0, -10], [0, -10], [0, -10]],
	idle: ['close', [80, -10], [15, -10], [-50, -10], [-50, -10]],
	windup: ['close', [100, -14], [20, -14], [-100, -10], [-19, -10]],
	roar: ['open', [40, -14], [0, -14], [0, -14], [-22, -8]],
	aim: ['close', [80, -10], [15, -10], [-50, -10], ['target', -10]],
	aimClose: ['close-fast', [80, -10], [15, -10], [-50, -10], ['target', -10]],
	aimOpen: ['open', [80, -10], [15, -10], [-50, -10], ['target', -10]],
	shoot: ['open-fast', [80, -10], [15, -10], [-50, -10], ['target', -5]],
	aimbite: ['open', [80, -17], [-30, -15], [-30, -15], ['target', -10]],
	bite: ['close-fast', [65, -17], [-62, -17], [-23, -15], ['target', -15]],
	thrashup: ['open', [20, -10], [20, -10], [20, -10], [20, -10]],
	thrashdown: ['open', [-20, -10], [-20, -10], [-20, -10], [-20, -10]]
};

var _headWidth = null, _headHeight = null, _width = null;

function setSegmentPosture(segment, pos, flip) {
	var r = flip ? -pos[0] : pos[0];
	var t = flip ? -pos[1] : pos[1];
	var cssValue = 'rotate(' + r + 'deg) translateX(' + t + 'px)';
	segment.css({
		'transform': cssValue,
		'-webkit-transform': cssValue,
		'-moz-transform': cssValue,
		'-ms-transform': cssValue,
		'-o-transform': cssValue
	});
}

function rad(deg) {
    return deg * Math.PI/180;
}

function deg(rad) {
	return rad * 180/Math.PI;
}

function rotate(v, theta) {
	var tRad = rad(theta);
    return {
        x: v.x*Math.cos(tRad) - v.y*Math.sin(tRad),
        y: v.x*Math.sin(tRad) + v.y*Math.cos(tRad),
        r: v.r + theta
    };
}

function translate(v, dx, dy) {
    return {
        x: v.x + dx,
        y: v.y + dy,
        r: v.r
    };
}

function getTargetRotation(pos, targetPos) {
	var dx = Math.abs(pos.x - targetPos.x);
	var dy = Math.abs(pos.y - targetPos.y);
	var theta = Math.atan(dy/dx);
	return (this.options.flip ? 1 : -1) * pos.r - deg(theta);
}

function explodeSegment(segment) {
	var explosion = G.make('segmentExplosion').appendTo(segment);
	segment.addClass('gone');
	explosion.css('left');
	explosion.addClass('exploded');
	setTimeout(function() {
		segment.remove();
	}, 400);
}

// The Fallen Dawnwyrm as drawn: its body, neck and head, and the show of each of
// its strikes. What it does and when is up to the field (src/core/field.ts).
var Dragon = function(options) {
	this.options = $.extend({}, this.options, {}, options);
	this.boss = this.options.boss;
	this.timers = [];

	this.hp(this.getMaxHealth());
	this.headFrame = 0;
	this.headState = 'close';
	this.target = this.options.target;
	this.isBoss = true;
	
	if(!postureSpeedStylesheet) {
		var style = document.createElement('style');
		style.appendChild(document.createTextNode("")); // Stupid Webkit
		document.head.appendChild(style);
		postureSpeedStylesheet = style.sheet;
	}
};
Dragon.prototype = new Monster({
	monsterClass: 'dragon',
	spriteName: 'dragon',
	speed: 80,
	animationFrames: 4
});
Dragon.constructor = Dragon;

Dragon.prototype.el = function() {
	if(this._el == null) {
		this._segments = [];
		this._el = Monster.prototype.el.call(this);
		if(this.options.flip) this._el.addClass('flip');
		this._segments.push(G.make('neck').appendTo(this._el));
		this._segments.push(G.make('neck').appendTo(this._segments[0]));
		this._segments.push(G.make('neck').appendTo(this._segments[1]));
		this._segments.push(G.make('head').appendTo(this._segments[2]));
	}
	return this._el;
};

Dragon.prototype.getHead = function() {
	return this._segments[3];
};

Dragon.prototype.headHeight = function() {
	if(!_headHeight) {
		_headHeight = this._segments[3].height();
	}
	return _headHeight;
};

Dragon.prototype.headWidth = function() {
	if(!_headWidth) {
		_headWidth = this._segments[3].width();
	}
	return _headWidth;
};

Dragon.prototype.width = function() {
	if(!_width) {
		_width = this.el().width();
	}
	return _width;
};

Dragon.prototype.animate = function() {
	Monster.prototype.animate.call(this);
	var inc = 1;
	if(this.animateHead != null && this.animateHead.indexOf('-fast') > 0) {
		this.animateHead = this.animateHead.substring(0, this.animateHead.indexOf('-fast'));
		inc = 2;
	}
	if(this.animateHead != null && this.animateHead != this.headState) {
		if(this.animateHead == 'open' && (this.headFrame += inc) >= 2) {
			this.animateHead = null;
			this.headState = this.animateHead;
			this.headFrame = 2;
		} else if(this.animateHead == 'close' && (this.headFrame -= inc) <= 0) {
			this.animateHead = null;
			this.headState = this.animateHead;
			this.headFrame = 0;
		}
		var y = this.options.flip ? this.headHeight() : 0;
		y += Sprites.getOffset('dragonhead');
		G.updateSpritePos(
			this._segments[3], 
			this.headWidth() * this.headFrame, 
			y
		);
	}
};

Dragon.prototype.animation = function(row, stopTempAnimations, stepFunction) {
	row += this.options.flip ? ANIMATION_ROWS : 0;
	Monster.prototype.animation.call(this, row, stopTempAnimations, stepFunction);
};

Dragon.prototype.animationOnce = function(row, stepFunction) {
	row += this.options.flip ? ANIMATION_ROWS : 0;
	Monster.prototype.animationOnce.call(this, row, stepFunction);
};

Dragon.prototype.setNeckMount = function(pos) {
	pos = pos || headMount;
	var css = {
		top: pos.y + 'px'
	};
	if(this.options.flip) {
		css.right = pos.x + 'px';
	} else {
		css.left = pos.x + 'px';
	}
	this._segments[0].css(css);
};

Dragon.prototype.explode = function(delay) {
	var _this = this;
	var segmentNum = _this._segments.length - 1;
	(function doExplode() {
		explodeSegment(_this._segments[segmentNum]);
		EventManager.trigger('segmentExplode');
		if(segmentNum-- > 0) {
			setTimeout(doExplode, delay);
		} else {
			setTimeout(function() {
				EventManager.trigger('dragonExplode');
				var explosion = G.make('dragonExplosion').appendTo(_this.el());
				explosion.css('left');
				explosion.addClass('exploded');
				_this.el().addClass('gone');
				setTimeout(function() {
					explosion.remove();
					_this.el().remove();
					_this.dead = true;
					_this.action = null;
					_this.gone = true;
				}, 2000);
			}, delay);
		}
	})();
};

Dragon.prototype.setPosture = function(p, speed) {
	if(this.currentPosture == null || this.currentPosture != p) {
		this.currentPosture = p;
		var pos = posture[p];
		if(pos) {
			if(postureSpeedStylesheet.cssRules.length > 0) {
				postureSpeedStylesheet.deleteRule(0);
			}
			if(postureSpeedStylesheet.addRule) {
				postureSpeedStylesheet.addRule(
					'.dragon .neck, .dragon .head', 
					'transition-duration: ' + speed + 'ms',
				0);
			} else {
				postureSpeedStylesheet.insertRule(
					'.dragon .neck, .dragon .head {' +
					'transition-duration: ' + speed + 'ms; }',
				0);
			}
			
			var headPos = { x: 0, y: 0, r: 0 };
			var dynamicPos = null;
			for(var i = this._segments.length; i > 0; i--) {
				var r;
				if(!isNaN(pos[i][0])) {
					setSegmentPosture(this._segments[i - 1], pos[i], this.options.flip);
					r = pos[i][0];
				} else {
					r = 0;
					dynamicPos = pos[i];
				}

				if(i < this._segments.length) {
					headPos = translate(rotate(headPos, r * (this.options.flip ? -1 : 1)), 
							pos[i][1] * (this.options.flip ? -1 : 1), 0);
				}
			}
			
			var dragonPos = this.el().position();
			this.animateHead = pos[0];
			var left;
			if(this.options.flip) {
				left = dragonPos.left + this.width() - headMount.x + headPos.x - 20;
			} else {
				left = headMount.x + dragonPos.left + headPos.x + 10;
			}
			
			this.absHeadPos = {
				x: left,
				y: headMount.y + dragonPos.top + headPos.y,
				r: headPos.r
			};
			
			if(dynamicPos != null) {
				var newPos = [
				    getTargetRotation.call(this, this.absHeadPos, { 
				    	x: this.target.p(), 
				    	y: G.worldHeight() - this.target.height()
			    	}), 
				    dynamicPos[1]
			    ];
				setSegmentPosture(this._segments[this._segments.length - 1], newPos, this.options.flip);
				if(this.options.flip) {
					this.absHeadPos.r = 180 + newPos[0] - headPos.r;
				} else {
					this.absHeadPos.r = -newPos[0] - headPos.r;
				}
			}
			
			setTimeout(function() {
				if(postureSpeedStylesheet.cssRules.length > 0) {
					postureSpeedStylesheet.deleteRule(0);
				}
			}, speed);
		}
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

function boom(x) {
	var explosion = G.make('fireBoom').css('transform', 'translateX(' + x + 'px)');
	G.addToWorld(explosion);
	explosion.css('left');
	explosion.addClass('exploded');
	setTimeout(function() {
		explosion.remove();
	}, 400);
}

// A strike begins
Dragon.prototype.strike = function(name, targetX) {
	var _this = this;
	switch(name) {
	case 'fireball':
		this.setPosture('aim', 500);
		this.later(function() {
			var angle = -_this.absHeadPos.r;
			var delta = -Math.sqrt(Math.pow(targetX - _this.absHeadPos.x, 2) + Math.pow(_this.absHeadPos.y, 2));
			_this.setPosture('shoot', 200);
			_this.projectile = G.make('dragonFireball').css({
				top: _this.absHeadPos.y,
				left: _this.absHeadPos.x,
				transform: 'rotate(' + angle + 'deg) translateX(0)'
			});
			G.addToWorld(_this.projectile);
			_this.projectile.css('left'); // Force redraw before animation
			_this.projectile.css('transform', 'rotate(' + angle + 'deg) translateX(' + delta + 'px)');
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
			if(name == 'fireBlast') {
				var reach = Math.sqrt(Math.pow(targetX - _this.absHeadPos.x, 2) + Math.pow(_this.absHeadPos.y, 2));
				_this.beam = G.make('fireBlast').css('width', (reach - 60) + 'px');
			} else {
				_this.beam = G.make('iceBeam');
			}
			_this.setPosture('aimOpen', 500);
			_this.getHead().append(_this.beam);
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
	var beam = this.beam;
	switch(name) {
	case 'fireball':
		if(this.projectile) {
			this.projectile.remove();
			this.projectile = null;
		}
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
			beam && beam.remove();
		}, 200);
		break;
	case 'fireBlast':
		beam && beam.remove();
		boom(targetX);
		break;
	case 'wingBuffet':
		EventManager.trigger('flap');
		break;
	}
};

// Thrashes, then comes apart segment by segment
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

export default Dragon;

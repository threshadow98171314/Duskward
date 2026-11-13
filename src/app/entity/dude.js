import EventManager from '../eventmanager.js';
import WorldEntity from './worldentity.js';
import Graphics from '../graphics/graphics.js';
import State from '../gamestate.js';
import ActionFactory from '../action/actionfactory.js';
import Content from '../gamecontent.js';
import W from '../world.js';
import * as Combat from '../../core/combat.ts';
import * as Progress from '../../core/progress.ts';

var dude = function() {
	this._el = null;
	this.carrying = null;
	this.action = null;
	Graphics.updateHealth(State.health, State.maxHealth());
	Graphics.updateExperience(State.xp, this.toLevel());
	this.shield = 0;
	this.sword = 0;
};
dude.prototype = new WorldEntity({
	className: 'dude',
	spriteName: 'dude',
	nightSpriteName: 'dudenight'
});
dude.constructor = dude;

dude.prototype.el = function() {
	if(this._el == null) {
		this._el = WorldEntity.prototype.el.call(this)
			.append(Graphics.make("animationLayer nightSprite"));
		this.held = Graphics.make("heldBlock").appendTo(this._el);;
	}
	return this._el;
};

dude.prototype.isAlive = function() {
	return State.health > 0;
};

dude.prototype.getAnimation = function(label) {
	if(label == "right" && this.carrying != null) {
		return 9;
	}
	return WorldEntity.prototype.getAnimation.call(this, label);
};

dude.prototype.think = function() {
	if(this.isIdle() && this.action == null) {
		var activity = W.getActivity();
		if(activity != null) {
			this.action = activity;
			this.action.doAction(this);
			return true;
		}
	}
	return false;
};

dude.prototype.gainXp = function(xp) {
	var result = Progress.gainXp(State.level, State.xp, xp);
	State.xp = result.xp;
	for(var i = 0; i < result.levelsGained; i++) {
		State.level++;
		State.counts.LEVEL = State.level;
		Graphics.levelUp(this);
		State.health = State.maxHealth();
		Graphics.updateHealth(State.health, State.maxHealth());
		EventManager.trigger('levelUp', [State.level]);
		if(this.action != null) {
			this.action.terminateAction(this);
		}
	}
	Graphics.updateExperience(State.xp, this.toLevel());
};

dude.prototype.toLevel = function() {
	return Progress.xpToLevel(State.level);
};

dude.prototype.heal = function(amount) {
	State.health += amount;
	State.health = State.health > State.maxHealth() ? State.maxHealth() : State.health;
	Graphics.updateHealth(State.health, State.maxHealth());
};

dude.prototype.getDamage = function() {
	var hit = Combat.heroDamage(State.level, this.sword, State.highestTileLevel('stone'));
	if(hit.usesSword) {
		this.sword--;
		Graphics.updateSword(this.sword, State.maxSword());
	}
	return hit.damage;
};

dude.prototype.takeDamage = function(damage, damager) {
	if(State.health > 0) {
		// The ward raised at dusk takes the first hits, then the shield
		var hadWard = State.ward > 0, hadShield = this.shield > 0;
		var result = Combat.absorb(damage, {
			health: State.health,
			ward: State.ward || 0,
			shield: this.shield || 0,
			frozen: W.hasEffect('frozen')
		});
		State.ward = result.ward;
		if(hadWard) {
			EventManager.trigger('wardChanged', [State.ward, State.maxWard()]);
		}
		this.shield = result.shield;
		if(hadShield) {
			Graphics.updateShield(this.shield, State.maxShield());
		}
		State.health = result.health;
		if(State.health == 0 && this.action) {
			this.action.terminateAction(this);
		}
		if(State.health == 0) {
			EventManager.trigger('dudeDeath', [damager ? damager.options.monsterClass : "unknown"]);
		}
		Graphics.updateHealth(State.health, State.maxHealth());
	}
};

dude.prototype.animate = function() {
	WorldEntity.prototype.animate.call(this);
	if(this.carrying != null) {
		if(this.frame == 1) {
			this.held.css({transform: 'translate3d(0px, 1px, 0px)'});
		} else if(this.frame == 3) {
			this.held.css({transform: 'translate3d(0px, -1px, 0px)'});
		} else {
			this.held[0].style = '';
		}
	}
};

dude.prototype.animationOnce = function(row) {
	// Unarmed animation
	if((row == 3 || row == 4) && this.sword == 0) {
		row += 8;
	}
	WorldEntity.prototype.animationOnce.call(this, row);
};

dude.prototype.speed = function() {
	var speed = this.options.speed / W.getDebugMultiplier();
	return !W.hasEffect('haste') ? speed / 2 : speed / 8;
};

dude.prototype.hasSword = function() {
	return this.sword > 0;
};

export default dude;

import $ from '../../vendor/jquery.js';
import E from '../eventmanager.js';
import State from '../gamestate.js';
import Content from '../gamecontent.js';
import Graphics from './graphics.js';
import Blessings from '../blessings.js';

var _el = null;

function G() {
	return Graphics;
}

function el() {
	if(_el == null) {
		_el = G().make('duskSkills hidden')
			.append(G().make('duskGauge litBorder').append(G().make('fill')))
			.append(G().make('skillList'));
		_el.on('click touchstart', '.skill', function() {
			E.trigger('castSkill', [$(this).data('skillName')]);
			return false;
		});
		G().addToBoard(_el);
	}
	return _el;
}

function updateGauge(current, max) {
	if(_el == null) {
		return;
	}
	_el.find('.duskGauge .fill').css('height', (current / max * 100) + '%');
	_el.toggleClass('ready', current >= max);
}

// Shows a button for every skill the Altar of Dawn has unlocked; at night, only
// for the ones the keeper took into it
function refresh(night) {
	var level = State.skillLevel();
	if(level < 1) {
		return;
	}
	var list = el().find('.skillList').empty();
	for(var skillName in Content.Skills) {
		if(Content.Skills[skillName].level <= level && Blessings.canCast(skillName, night)) {
			G().make('skill litBorder ' + skillName)
				.data('skillName', skillName)
				.text(G().getText('SKILL_' + skillName.toUpperCase()))
				.appendTo(list);
		}
	}
	updateGauge(State.gauge || 0, State.maxGauge());
	setTimeout(function() {
		el().removeClass('hidden');
	}, 100);
}

export default {
	init: function() {
		_el = null;
		E.bind('gaugeChanged', updateGauge);
	},

	refresh: refresh
};

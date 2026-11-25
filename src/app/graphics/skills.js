import E from '../eventmanager.js';
import State from '../gamestate.js';
import Content from '../gamecontent.js';
import Graphics from './graphics.js';
import Blessings from '../blessings.js';
import { SkillBar } from '../../ui/skills.ts';

// The Afterglow gauge and the dusk skills that can be cast now (src/ui/skills.ts)

var bar = null;

// Shows a button for every skill the Altar of Dawn has unlocked; at night, only
// for the ones the keeper took into it
function refresh(night) {
	var level = State.skillLevel();
	if(level < 1) {
		return;
	}
	var skills = [];
	for(var skillName in Content.Skills) {
		if(Content.Skills[skillName].level <= level && Blessings.canCast(skillName, night)) {
			skills.push({ name: skillName, label: Graphics.getText('SKILL_' + skillName.toUpperCase()) });
		}
	}
	bar.setSkills(skills);
	bar.setGauge(State.gauge || 0, State.maxGauge());
}

export default {
	init: function() {
		bar = new SkillBar(Graphics.board(), function(skill) {
			E.trigger('castSkill', [skill]);
		});
		E.bind('gaugeChanged', function(current, max) {
			bar.setGauge(current, max);
		});
	},

	refresh: refresh
};

import E from './eventmanager.js';
import State from './gamestate.js';
import Content from './gamecontent.js';
import SkillGraphics from './graphics/skills.js';
import World from './world.js';

// The Afterglow gauge only fills once the Altar of Dawn is built
function gainGauge(points) {
	if(State.skillLevel() < 1) {
		return;
	}
	var max = State.maxGauge();
	State.gauge = Math.min(max, (State.gauge || 0) + points);
	E.trigger('gaugeChanged', [State.gauge, max]);
}

function castSkill(skillName) {
	var skill = Content.Skills[skillName];
	if(skill && State.skillLevel() >= skill.level && State.gauge >= State.maxGauge() &&
			World.canMove()) {
		State.gauge = 0;
		E.trigger('gaugeChanged', [0, State.maxGauge()]);
		skill.onUse();
		State.count('SKILLS', 1);
	}
}

export default {
	init: function() {
		SkillGraphics.init();
		E.bind('gaugeGain', gainGauge);
		E.bind('castSkill', castSkill);
		E.bind('enableSkills', SkillGraphics.refresh);
	}
};

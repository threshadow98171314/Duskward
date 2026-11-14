import E from './eventmanager.js';
import State from './gamestate.js';
import Content from './gamecontent.js';
import SkillGraphics from './graphics/skills.js';
import World from './world.js';
import Blessings from './blessings.js';

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
			World.canMove() && Blessings.canCast(skillName, World.isNight())) {
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
		var refresh = function() {
			SkillGraphics.refresh(World.isNight());
		};
		E.bind('enableSkills', refresh);
		E.bind('blessingChosen', refresh);
		// At night, only the skills taken into it show
		E.bind('phaseChange', function(toNight) {
			SkillGraphics.refresh(toNight);
		});
	}
};

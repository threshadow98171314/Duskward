import E from './eventmanager.js';
import S from './gamestate.js';
import { getModule } from './modules.js';
import { STATE_EFFECTS } from '../content/magic.ts';

// Carries out what an item, spell or skill does (see Effect in src/content/types.ts)
export function use(effects) {
	if(!Array.isArray(effects)) {
		effects = getModule('engine').isNight() ? effects.night : effects.day;
	}
	effects.forEach(apply);
}

function apply(effect) {
	switch(effect.type) {
	case 'heal':
		E.trigger('healDude', [Math.floor(S.maxHealth() * effect.share)]);
		break;
	case 'gainMana':
		E.trigger('gainMana', [Math.floor(S.maxMana() * effect.share)]);
		break;
	case 'damageAll':
		E.trigger('damageAll', [effect.amount]);
		break;
	case 'fillEquipment':
		E.trigger('fillEquipment');
		break;
	case 'fillWard':
		E.trigger('fillWard');
		break;
	case 'callDragon':
		E.trigger('callDragon');
		break;
	case 'refreshBoard':
		E.trigger('refreshBoard');
		break;
	case 'phaseChange':
		E.trigger('phaseChange', [!getModule('engine').isNight()]);
		break;
	case 'stateEffect':
		E.trigger('newStateEffect', [STATE_EFFECTS[effect.effect]]);
		break;
	case 'harvestEach':
		E.trigger('dawnlightHarvest', [effect.amount]);
		break;
	case 'extendDay':
		E.trigger('extendDay', [effect.moves]);
		break;
	case 'cue':
		E.trigger(effect.name);
		break;
	}
}

// What a building does once it stands
export function built(buildingType) {
	var effect = buildingType.onBuilt;
	if(effect == null) {
		return;
	}
	switch(effect.type) {
	case 'stockpile':
		E.trigger('resourceStoreChanged', [effect.rows, effect.columns]);
		break;
	case 'enableMagic':
		E.trigger('enableMagic');
		break;
	case 'wardCapacity':
		E.trigger('wardCapacityChanged');
		break;
	case 'enableSkills':
		E.trigger('enableSkills');
		break;
	}
}

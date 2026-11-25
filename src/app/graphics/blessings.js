import Graphics from './graphics.js';
import { offerChoice } from '../../ui/choices.ts';

// The dusk choice: Sera's offer of blessings for the night, as cards with the gift
// and the price spelled out, and the skills to take into the night (src/ui/choices.ts).
// Also the badge in the status that shows the chosen blessing until morning.

function G() {
	return Graphics;
}

function percent(scale) {
	return Math.round(scale * 100);
}

// What a boon does, in words, from its numbers
function describe(boon) {
	switch(boon.type) {
	case 'fill':
		return G().getText('BOON_FILL')[boon.what];
	case 'nightMoves':
		return G().getText(boon.moves > 0 ? 'BOON_NIGHT_LONGER' : 'BOON_NIGHT_SHORTER', Math.abs(boon.moves));
	case 'monsterHealth':
		return G().getText('BOON_MONSTER_HEALTH', percent(boon.scale) - 100);
	case 'monsterDamage':
		return G().getText('BOON_MONSTER_DAMAGE', boon.add);
	case 'spawns':
		return G().getText('BOON_SPAWNS', boon.scale);
	case 'xp':
		return boon.scale >= 1 ? G().getText('BOON_XP_UP', boon.scale) : G().getText('BOON_XP_DOWN', percent(boon.scale));
	case 'calm':
		return G().getText('BOON_CALM');
	case 'loot':
		return G().getText('BOON_LOOT', boon.scale);
	case 'arrivals':
		return G().getText('BOON_ARRIVALS', boon.count, G().getText('MONSTER_NAMES')[boon.monster]);
	case 'chainCall':
		return G().getText('BOON_CHAIN_CALL', boon.waves);
	}
	return '';
}

// A blessing's card: what it gives, and what it costs
function card(id, blessing) {
	return {
		name: G().getText('BLESSING_NAMES')[id],
		gift: blessing.gift.map(describe).join('、'),
		price: blessing.price.length > 0 ? blessing.price.map(describe).join('、') : G().getText('NO_PRICE')
	};
}

function showBadge(omen, id) {
	G().status().showBadge(G().getText('OMEN_NAMES')[omen],
		id ? G().getText('TONIGHT', G().getText('BLESSING_NAMES')[id]) : null);
}

export default {
	init: function() {
	},

	// Shows tonight's omen and the choice; done(blessing or null, skills or null) once the keeper has chosen
	offer: function(omen, ids, skills, done, blessings) {
		blessings = blessings || {};
		var omenText = G().getText('OMEN_WORDS')[omen.id];
		if(omen.effects.length > 0) {
			omenText += '（' + omen.effects.map(describe).join('、') + '）';
		}
		offerChoice(document.getElementById('gameContainer'), {
			omen: { name: G().getText('OMEN', G().getText('OMEN_NAMES')[omen.id]), text: omenText },
			speaker: G().getText('SERA'),
			text: G().getText('DUSK_CHOICE'),
			skills: skills ? {
				title: G().getText('SKILL_LOADOUT'),
				skills: skills.unlocked.map(function(name) {
					return { name: name, label: G().getText('SKILL_' + name.toUpperCase()) };
				}),
				picked: skills.loadout
			} : undefined,
			cards: ids.map(function(id) {
				return card(id, blessings[id]);
			}),
			skip: G().getText('NO_BLESSING')
		}, function(chosen, loadout) {
			var id = chosen == null ? null : ids[chosen];
			showBadge(omen.id, id);
			done(id, loadout);
		});
	},

	clear: function() {
		G().status().clearBadge();
	},

	describe: describe
};

import $ from '../../vendor/jquery.js';
import Graphics from './graphics.js';

// The dusk choice: Sera's offer of blessings for the night, as cards with the gift
// and the price spelled out, and the skills to take into the night. Also the
// badge that shows the chosen blessing until morning.

var FADE_TIME = 500;

var badge = null;

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
	}
	return '';
}

function card(id, blessing) {
	var price = blessing.price.length > 0 ? blessing.price.map(describe).join('、') : G().getText('NO_PRICE');
	return G().make('choiceCard')
		.data('blessing', id)
		.append(G().make('cardName').text(G().getText('BLESSING_NAMES')[id]))
		.append(G().make('cardGift').text(blessing.gift.map(describe).join('、')))
		.append(G().make('cardPrice').text(price));
}

function showBadge(id) {
	if(badge == null) {
		badge = G().make('blessingBadge');
		G().getStatusContainer().append(badge);
	}
	badge.text(G().getText('TONIGHT', G().getText('BLESSING_NAMES')[id]));
}

export default {
	init: function() {
		badge = null;
	},

	// Shows the choice; done(blessing or null, skills or null) once the keeper has chosen
	offer: function(ids, skills, done, blessings) {
		blessings = blessings || {};
		var panel = G().make('duskChoice hidden')
			.append(G().make('choiceSpeaker').text(G().getText('SERA')))
			.append(G().make('choiceText').text(G().getText('DUSK_CHOICE')));

		var picks = null;
		if(skills) {
			picks = G().make('skillPicks').append(G().make('skillPicksTitle').text(G().getText('SKILL_LOADOUT')));
			skills.unlocked.forEach(function(name) {
				G().make('skillPick litBorder' + (skills.loadout.indexOf(name) >= 0 ? ' picked' : ''))
					.data('skill', name)
					.text(G().getText('SKILL_' + name.toUpperCase()))
					.appendTo(picks);
			});
			panel.append(picks);
		}

		var cards = G().make('choiceCards');
		ids.forEach(function(id) {
			cards.append(card(id, blessings[id]));
		});
		panel.append(cards).append(G().make('choiceSkip').text(G().getText('NO_BLESSING')));

		var order = picks ? picks.find('.picked').map(function() { return $(this).data('skill'); }).get() : [];
		panel.on('click touchstart', '.skillPick', function() {
			var name = $(this).data('skill');
			var at = order.indexOf(name);
			if(at >= 0) {
				order.splice(at, 1);
			} else {
				order.push(name);
				// Taking a third lets go of the first
				if(order.length > 2) {
					order.shift();
				}
			}
			picks.find('.skillPick').each(function() {
				$(this).toggleClass('picked', order.indexOf($(this).data('skill')) >= 0);
			});
			picks.removeClass('needed');
			return false;
		});
		panel.on('click touchstart', '.choiceCard, .choiceSkip', function() {
			if(picks && order.length != 2) {
				picks.addClass('needed');
				return false;
			}
			var id = $(this).data('blessing') || null;
			panel.off().addClass('hidden');
			setTimeout(function() {
				panel.remove();
			}, FADE_TIME);
			if(id) {
				showBadge(id);
			}
			done(id, picks ? order.slice() : null);
			return false;
		});
		// Nothing behind the choice reacts while it is open
		panel.on('click touchstart', function() {
			return false;
		});
		panel.appendTo('#gameContainer');
		panel.css('opacity'); // Force a reflow so the transition runs
		panel.removeClass('hidden');
	},

	clear: function() {
		if(badge != null) {
			badge.remove();
			badge = null;
		}
	},

	describe: describe
};

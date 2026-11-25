import E from '../eventmanager.js';
import State from '../gamestate.js';
import Graphics from './graphics.js';
import { CHAPTERS } from '../../content/story.ts';
import { MONSTERS } from '../../content/monsters.ts';
import { BOSSES } from '../../content/bosses.ts';
import { recordsMenu } from '../../ui/menu.ts';
import { bestiaryList, journalList, openRecord } from '../../ui/records.ts';

// The keeper's records, from the menu: the journal (every chapter told so far,
// to read again) and the bestiary (every monster met, with what Sera said of it).
// The game waits while they are open. src/ui/records.ts draws them.

var G = null, _el = null;

function words(id) {
	return (G.getText('STORY') || {})[id] || G.getText('JOURNAL')[id] || id;
}

function open(title, list) {
	E.trigger('hold');
	openRecord(document.getElementById('gameContainer'), title, list, G.getText('CLOSE'), function() {
		E.trigger('letGo');
	});
}

// Every chapter told, newest first
function journal() {
	var log = (State.storyLog || []).slice().reverse();
	// Saves from before the journal kept its order only know what was told
	var logged = {};
	log.forEach(function(entry) {
		logged[entry[0]] = true;
	});
	Object.keys(CHAPTERS).forEach(function(id) {
		if((State.storySeen || {})[id] && !logged[id]) {
			log.push([id, null]);
		}
	});
	var names = G.getText('CHARACTER_NAMES');
	var entries = log.filter(function(entry) {
		return CHAPTERS[entry[0]] != null;
	}).map(function(entry) {
		return {
			day: entry[1] == null ? G.getText('JOURNAL_EARLIER') : G.getText('DAY_N', entry[1]),
			lines: CHAPTERS[entry[0]].lines.map(function(line) {
				return { who: names[line.who], say: words(line.say) };
			})
		};
	});
	open(G.getText('JOURNAL_TITLE'), journalList(entries, G.getText('JOURNAL_EMPTY')));
}

// Every monster met; the rest are only shadows
function bestiary() {
	var told = State.storySeen || {};
	var names = G.getText('MONSTER_NAMES');
	var monsters = Object.keys(MONSTERS).map(function(kind) {
		var def = MONSTERS[kind];
		return {
			known: !!told['monster_' + kind],
			name: names[kind],
			sprite: def.sprite,
			stats: G.getText('BESTIARY_STATS', def.health, def.damage),
			line: words('monster_' + kind)
		};
	});
	var bosses = Object.keys(BOSSES).map(function(kind) {
		return {
			known: !!told[kind],
			name: names[kind],
			boss: kind,
			stats: G.getText('BESTIARY_BOSS', BOSSES[kind].health),
			line: words(kind)
		};
	});
	open(G.getText('BESTIARY_TITLE'), bestiaryList(monsters.concat(bosses)));
}

export default {
	init: function() {
		G = Graphics;
		if(_el) {
			_el.remove();
		}
		_el = recordsMenu(G.getText('RECORDS'), [
			{ label: G.getText('JOURNAL_TITLE'), open: journal },
			{ label: G.getText('BESTIARY_TITLE'), open: bestiary }
		]);
		G.addToMenu(_el);
	}
};

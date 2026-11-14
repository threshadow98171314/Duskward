import $ from '../../vendor/jquery.js';
import E from '../eventmanager.js';
import State from '../gamestate.js';
import Graphics from './graphics.js';
import Sprites from './sprites.js';
import { CHAPTERS } from '../../content/story.ts';
import { MONSTERS } from '../../content/monsters.ts';
import { BOSSES } from '../../content/bosses.ts';

// The keeper's records, from the menu: the journal (every chapter told so far,
// to read again) and the bestiary (every monster met, with what Sera said of it).
// The game waits while they are open.

var FADE_TIME = 500;

var G = null, _el = null;

function words(id) {
	return (G.getText('STORY') || {})[id] || G.getText('JOURNAL')[id] || id;
}

function open(title, content) {
	E.trigger('hold');
	var panel = G.make('records hidden')
		.append(G.make('recordsTitle').text(title))
		.append(content.addClass('recordsList'))
		.append(G.make('recordsClose litBorder').text(G.getText('CLOSE')))
		.appendTo('#gameContainer');
	panel.on('click touchstart', '.recordsClose', function() {
		panel.off().addClass('hidden');
		setTimeout(function() {
			panel.remove();
		}, FADE_TIME);
		E.trigger('unpause');
		return false;
	});
	// Scrolling the list is fine; nothing behind it reacts
	panel.on('click touchstart', function(e) {
		e.stopPropagation();
	});
	panel.css('opacity');
	panel.removeClass('hidden');
}

// Every chapter told, newest first
function journal() {
	var list = G.make();
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
	if(log.length == 0) {
		list.append(G.make('recordsEmpty').text(G.getText('JOURNAL_EMPTY')));
	}
	log.forEach(function(entry) {
		var chapter = CHAPTERS[entry[0]];
		if(!chapter) {
			return;
		}
		var day = entry[1] == null ? G.getText('JOURNAL_EARLIER') : G.getText('DAY_N', entry[1]);
		var item = G.make('recordsEntry').append(G.make('recordsDay').text(day));
		chapter.lines.forEach(function(line) {
			item.append(G.make('recordsLine')
				.append($('<b>').text(G.getText('CHARACTER_NAMES')[line.who] + '：'))
				.append($('<span>').text(words(line.say))));
		});
		list.append(item);
	});
	open(G.getText('JOURNAL_TITLE'), list);
}

// A picture of a monster, from its sprite sheet
function picture(kind, def) {
	var scale = Math.min(1, 56 / Math.max(def.width, def.height));
	return G.make('recordsPicture').append(G.make('recordsSprite').css({
		width: def.width + 'px',
		height: def.height + 'px',
		'background-position': '0 -' + (Sprites.getOffset(def.sprite) + def.height) + 'px',
		transform: 'scale(' + scale + ')'
	}));
}

// Every monster met; the rest are only shadows
function bestiary() {
	var list = G.make();
	var told = State.storySeen || {};
	var names = G.getText('MONSTER_NAMES');
	Object.keys(MONSTERS).forEach(function(kind) {
		var def = MONSTERS[kind];
		var met = told['monster_' + kind];
		var item = G.make('recordsEntry recordsMonster' + (met ? '' : ' unknown'));
		item.append(met ? picture(kind, def) : G.make('recordsPicture'));
		var text = G.make('recordsText').append(G.make('recordsName').text(met ? names[kind] : '？？？'));
		if(met) {
			text.append(G.make('recordsStats').text(G.getText('BESTIARY_STATS', def.health, def.damage)))
				.append(G.make('recordsLine').text(words('monster_' + kind)));
		}
		list.append(item.append(text));
	});
	Object.keys(BOSSES).forEach(function(kind) {
		var met = told[kind];
		var item = G.make('recordsEntry recordsMonster' + (met ? '' : ' unknown')).append(G.make('recordsPicture boss ' + kind));
		var text = G.make('recordsText').append(G.make('recordsName').text(met ? names[kind] : '？？？'));
		if(met) {
			text.append(G.make('recordsStats').text(G.getText('BESTIARY_BOSS', BOSSES[kind].health)))
				.append(G.make('recordsLine').text(words(kind)));
		}
		list.append(item.append(text));
	});
	open(G.getText('BESTIARY_TITLE'), list);
}

function el() {
	if(_el == null) {
		G.addStyleRule('.recordsMenu:before', 'content:"- ' + G.getText('RECORDS') + ' -";');
		_el = G.make('recordsMenu submenu', 'ul');
		[['JOURNAL_TITLE', journal], ['BESTIARY_TITLE', bestiary]].forEach(function(entry) {
			G.make('litBorder', 'li').text(G.getText(entry[0])).on('click touchstart', function() {
				entry[1]();
				return false;
			}).appendTo(_el);
		});
		G.addToMenu(_el);
	}
	return _el;
}

export default {
	init: function() {
		G = Graphics;
		if(_el) {
			_el.remove();
		}
		_el = null;
		el();
	}
};

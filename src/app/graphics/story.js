import $ from '../../vendor/jquery.js';
import E from '../eventmanager.js';
import Graphics from './graphics.js';
import { CHARACTERS } from '../../content/story.ts';

var PORTRAIT_SIZE = 48;

var FADE_TIME = 500;
var JOURNAL_BASE_TIME = 6000;

var queue = [];
var busy = false;

function G() {
	return Graphics;
}

function enqueue(show) {
	queue.push(show);
	next();
}

// Only one story box is on screen at a time; the rest wait their turn
function next() {
	if(busy || queue.length == 0) {
		return;
	}
	busy = true;
	queue.shift()(function() {
		busy = false;
		next();
	});
}

function fadeIn(el) {
	el.css('opacity'); // Force a reflow so the transition runs
	el.removeClass('hidden');
}

function fadeOut(el, done) {
	el.off().addClass('hidden');
	setTimeout(function() {
		el.remove();
		done();
	}, FADE_TIME);
}

function drawIntro(pages, done, className) {
	var page = 0;
	var text = G().make('storyText').text(pages[0]);
	var overlay = G().make('storyIntro hidden ' + (className || ''))
		.append(text)
		.append(G().make('storyHint').text(G().getText('TAP_TO_CONTINUE')))
		.appendTo('#gameContainer');

	overlay.on('click touchstart', function() {
		page++;
		if(page >= pages.length) {
			fadeOut(overlay, done);
		} else {
			text.addClass('hidden');
			setTimeout(function() {
				text.text(pages[page]).removeClass('hidden');
			}, FADE_TIME);
		}
		return false;
	});
	fadeIn(overlay);
}

// The words of a story line, from the story's texts or the older journal
function words(id) {
	return (G().getText('STORY') || {})[id] || G().getText('JOURNAL')[id] || id;
}

function drawLines(lines, onChoice, done) {
	var line = lines.shift();
	if(!line) {
		done();
		return;
	}
	drawLine(line, function(choice) {
		if(choice) {
			onChoice(choice);
			lines = (choice.reply || []).concat(lines);
		}
		drawLines(lines, onChoice, done);
	});
}

// One line of dialogue. A line with a choice holds the game until it is answered.
function drawLine(line, done) {
	var text = words(line.say);
	var portrait = G().make('portrait')
		.css('background-position', -(CHARACTERS[line.who].portrait * PORTRAIT_SIZE) + 'px 0');
	var body = G().make('dialogueBody')
		.append(G().make('journalSpeaker').text(G().getText('CHARACTER_NAMES')[line.who]))
		.append(G().make('journalText').text(text));
	var box = G().make('journal dialogue hidden').append(portrait).append(body).appendTo('#gameContainer');

	if(line.choices) {
		E.trigger('hold');
		var answers = G().make('dialogueChoices').appendTo(body);
		line.choices.forEach(function(choice) {
			G().make('dialogueChoice litBorder').text(words(choice.say)).data('choice', choice).appendTo(answers);
		});
		box.on('click touchstart', '.dialogueChoice', function() {
			var choice = $(this).data('choice');
			E.trigger('letGo');
			fadeOut(box, function() {
				done(choice);
			});
			return false;
		});
		box.on('click touchstart', function() {
			return false;
		});
	} else {
		var perChar = G().getLocale() == 'zh-TW' ? 150 : 50;
		var timer = null;
		var close = function() {
			clearTimeout(timer);
			fadeOut(box, function() {
				done(null);
			});
		};
		timer = setTimeout(close, JOURNAL_BASE_TIME + text.length * perChar);
		box.on('click touchstart', function() {
			close();
			return false;
		});
	}
	fadeIn(box);
}

function drawJournal(speaker, text, done) {
	var perChar = G().getLocale() == 'zh-TW' ? 150 : 50;
	var box = G().make('journal hidden')
		.append(G().make('journalSpeaker').text(speaker))
		.append(G().make('journalText').text(text))
		.appendTo('#gameContainer');
	var timer = setTimeout(close, JOURNAL_BASE_TIME + text.length * perChar);

	function close() {
		clearTimeout(timer);
		fadeOut(box, done);
	}

	box.on('click touchstart', function() {
		close();
		return false;
	});
	fadeIn(box);
}

export default {
	init: function() {
		queue.length = 0;
		busy = false;
		$('.storyIntro, .journal').remove();
	},

	showIntro: function(pages) {
		enqueue(drawIntro.bind(null, pages));
	},

	// The ending: the same pages as the opening, at the break of a real dawn
	showEnding: function(pages, done) {
		enqueue(function(next) {
			drawIntro(pages, function() {
				next();
				done && done();
			}, 'storyEnding');
		});
	},

	showJournal: function(speaker, text) {
		enqueue(drawJournal.bind(null, speaker, text));
	},

	// Plays a chapter's lines; onChoice(choice) when the keeper answers one
	tell: function(lines, onChoice) {
		enqueue(function(next) {
			drawLines(lines.slice(), onChoice, next);
		});
	}
};

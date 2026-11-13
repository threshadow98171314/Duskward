import $ from '../../vendor/jquery.js';
import Graphics from './graphics.js';

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
	}
};

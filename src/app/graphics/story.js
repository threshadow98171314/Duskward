import E from '../eventmanager.js';
import Graphics from './graphics.js';
import { CHARACTERS } from '../../content/story.ts';
import { StoryBoxes } from '../../ui/story.ts';

// The story on screen (src/ui/story.ts): the opening and the ending, Sera's journal
// entries, and the chapters, told in lines of dialogue that may ask the keeper to choose

var boxes = null;

function G() {
	return Graphics;
}

// The words of a story line, from the story's texts or the older journal
function words(id) {
	return (G().getText('STORY') || {})[id] || G().getText('JOURNAL')[id] || id;
}

// Plays lines one after another; an answer chosen brings in its reply before the rest
function drawLines(lines, onChoice, done) {
	var line = lines.shift();
	if(!line) {
		done();
		return;
	}
	boxes.line({
		speaker: G().getText('CHARACTER_NAMES')[line.who],
		portrait: CHARACTERS[line.who].portrait,
		text: words(line.say),
		choices: (line.choices || []).map(function(choice) {
			return words(choice.say);
		})
	}, function(answer) {
		if(answer != null) {
			var choice = line.choices[answer];
			onChoice(choice);
			lines = (choice.reply || []).concat(lines);
		}
		drawLines(lines, onChoice, done);
	});
}

export default {
	init: function() {
		if(boxes) {
			boxes.clear();
		}
		boxes = new StoryBoxes(document.getElementById('gameContainer'), {
			tapToContinue: G().getText('TAP_TO_CONTINUE'),
			msPerCharacter: G().getLocale() == 'zh-TW' ? 150 : 50,
			hold: function() {
				E.trigger('hold');
			},
			letGo: function() {
				E.trigger('letGo');
			}
		});
	},

	showIntro: function(pages) {
		boxes.enqueue(function(done) {
			boxes.intro(pages, done);
		});
	},

	// The ending: the same pages as the opening, at the break of a real dawn
	showEnding: function(pages, done) {
		boxes.enqueue(function(next) {
			boxes.intro(pages, function() {
				next();
				done && done();
			}, 'storyEnding');
		});
	},

	showJournal: function(speaker, text) {
		boxes.enqueue(function(done) {
			boxes.journal(speaker, text, done);
		});
	},

	// Plays a chapter's lines; onChoice(choice) when the keeper answers one
	tell: function(lines, onChoice) {
		boxes.enqueue(function(next) {
			drawLines(lines.slice(), onChoice, next);
		});
	}
};

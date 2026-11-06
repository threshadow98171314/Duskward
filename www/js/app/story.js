define(['app/eventmanager', 'app/gamestate', 'app/graphics/story'], function(E, State, StoryGraphics) {

	var JOURNAL_DELAY = 3500; // Let the "Day N" notice clear first
	var EVENT_DELAY = 1500;

	var newGame = false;

	function G() {
		return require('app/graphics/graphics');
	}

	// Each story entry is shown once per save slot
	function markSeen(id) {
		State.storySeen = State.storySeen || {};
		if(State.storySeen[id]) {
			return false;
		}
		State.storySeen[id] = true;
		return true;
	}

	function tell(id, delay) {
		var text = G().getText('JOURNAL')[id];
		if(text && markSeen(id)) {
			setTimeout(function() {
				StoryGraphics.showJournal(G().getText('SERA'), text);
			}, delay || 0);
		}
	}

	function handleGameLoaded() {
		if(newGame) {
			newGame = false;
			StoryGraphics.showIntro(G().getText('STORY_INTRO'));
		}
		if(State.counts && State.counts.DEATHS > 0) {
			tell('firstDeath', EVENT_DELAY);
		}
	}

	return {
		init: function() {
			StoryGraphics.init();
			E.bind('newGame', function() {
				newGame = true;
			});
			E.bind('gameLoaded', handleGameLoaded);
			E.bind('dayBreak', function(dayNumber) {
				tell('day' + dayNumber, JOURNAL_DELAY);
			});
			E.bind('phaseChange', function(toNight) {
				if(toNight) {
					tell('firstNight', EVENT_DELAY);
				}
			});
			E.bind('levelUp', function(level) {
				tell('level' + level, EVENT_DELAY);
			});
			E.bind('enableMagic', function() {
				tell('magic', EVENT_DELAY);
			});
			E.bind('lootGained', function(lootName) {
				if(lootName == 'shard') {
					tell('firstShard', EVENT_DELAY);
				}
			});
			E.bind('callDragon', function() {
				tell('dragon');
			});
		}
	};
});

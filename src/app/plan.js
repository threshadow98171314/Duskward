import $ from '../vendor/jquery.js';
import E from './eventmanager.js';
import State from './gamestate.js';
import Graphics from './graphics/graphics.js';

// The morning's building plan: when a new building is ready to be raised and
// there is more than one to choose from, the keeper is asked which comes first.
// The answer marks that building, as clicking it would; the keeper can also leave
// the order to their own judgement. The game waits while the keeper chooses.

var MORNING_DELAY = 6000;
var FADE_TIME = 500;

function G() {
	return Graphics;
}

function waiting() {
	return State.buildings.filter(function(building) {
		return !building.built && !building.obsolete;
	});
}

// "bricklayer3" is the third level of the bricklayer
function buildingName(className) {
	var match = /^([a-z]+?)(\d*)$/.exec(className);
	var name = G().getText('BUILDING_NAMES')[match[1]] || className;
	return match[2] ? name + G().getText('LEVEL_N', match[2]) : name;
}

function costText(building) {
	var names = G().getText('RESOURCE_NAMES');
	var parts = [];
	for(var resource in building.requiredResources) {
		if(building.requiredResources[resource] > 0) {
			parts.push(names[resource] + ' ×' + building.requiredResources[resource]);
		}
	}
	return parts.length > 0 ? parts.join('、') : G().getText('NO_COST');
}

function ask() {
	var buildings = waiting();
	State.plannedSeen = State.plannedSeen || [];
	var fresh = buildings.some(function(building) {
		return State.plannedSeen.indexOf(building.options.type.className) < 0;
	});
	var chosen = buildings.some(function(building) {
		return building.options.type.className == State.prioritizedBuilding;
	});
	if(buildings.length < 2 || !fresh || chosen) {
		return;
	}
	buildings.forEach(function(building) {
		State.plannedSeen.push(building.options.type.className);
	});

	E.trigger('hold');
	var cards = G().make('choiceCards');
	buildings.forEach(function(building) {
		G().make('choiceCard')
			.data('building', building)
			.append(G().make('cardName').text(buildingName(building.options.type.className)))
			.append(G().make('cardGift').text(costText(building)))
			.appendTo(cards);
	});
	var panel = G().make('duskChoice buildPlan hidden')
		.append(G().make('choiceSpeaker').text(G().getText('SERA')))
		.append(G().make('choiceText').text(G().getText('BUILD_PLAN')))
		.append(cards)
		.append(G().make('choiceSkip').text(G().getText('BUILD_PLAN_SKIP')))
		.appendTo('#gameContainer');
	panel.on('click touchstart', '.choiceCard, .choiceSkip', function() {
		var building = $(this).data('building');
		panel.off().addClass('hidden');
		setTimeout(function() {
			panel.remove();
		}, FADE_TIME);
		if(building) {
			E.trigger('prioritizeBuilding', [building]);
		}
		E.trigger('letGo');
		return false;
	});
	panel.on('click touchstart', function() {
		return false;
	});
	panel.css('opacity');
	panel.removeClass('hidden');
}

export default {
	init: function() {
		E.bind('dayBreak', function() {
			setTimeout(ask, MORNING_DELAY);
		});
	},

	buildingName: buildingName
};

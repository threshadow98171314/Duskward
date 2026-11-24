import E from '../eventmanager.js';
import State from '../gamestate.js';
import Content from '../gamecontent.js';
import { getModule } from '../modules.js';
import Graphics from './graphics.js';

var G = null;

function openChest(chest) {
	chest.animation(1);
}

// What the chest held shows above it for a moment
function drawLoot(loot, entity) {
	G.effects().loot(loot, entity.p());
}

function updateLootButtons() {
	for(var lootName in State.items) {
		updateLootButton(lootName, State.items[lootName]);
	}
}

function updateLootButton(loot, num) {
	var btn = G.get("." + loot, el());
	if(btn == null) {
		btn = G.make("hidden button litBorder " + loot)
			.append(G.make())
			.data('lootName', loot)
			.appendTo(el())
			.append(G.make());
		if(!Content.LootType[loot].large) {
			btn.append(G.make()).append(G.make());
		} else {
			btn.addClass('large');
		}
	}
	btn.removeClass('charge_0 charge_1 charge_2 charge_3').addClass('charge_' + num);
	btn.removeClass('hidden');
}

// A bomb goes off around the keeper
function drawLootEffect(loot) {
	if(loot == 'bomb') {
		G.effects().blast(getModule('world').getDude().p());
		G.effects().shake(6, 500);
	}
}

var _el = null;
function el() {
	if(_el == null) {
		_el = G.make('hidden inventory litBorder');
		G.addToBoard(_el);
		setTimeout(function() {
			_el.removeClass('hidden');
		}, 100);
	}
	return _el;
}

export default {
	init: function() {
		_el = null;
		
		G = Graphics;
		
		E.bind('pickupLoot', openChest);
		E.bind('lootGained', drawLoot);
		E.bind('lootFound', updateLootButton);
		E.bind('lootUsed', updateLootButton);
		E.bind('lootUsed', drawLootEffect);
		E.bind('gameLoaded', updateLootButtons);
		
		updateLootButtons();
	}
};

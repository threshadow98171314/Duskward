import E from '../eventmanager.js';
import State from '../gamestate.js';
import Content from '../gamecontent.js';
import Graphics from './graphics.js';
import WorldGraphics from './world.js';
import { Inventory } from '../../ui/inventory.ts';

// Loot on screen: a chest opening and what it held showing above it, the items the
// keeper carries (src/ui/inventory.ts), and a bomb going off around the keeper

var G = null;
var inventory = null;

function openChest(chest) {
	WorldGraphics.actors().openChest(chest);
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
	inventory.set(loot, num, !!Content.LootType[loot].large);
}

// A bomb goes off around the keeper, where they are drawn
function drawLootEffect(loot) {
	var keeper = WorldGraphics.actors().keeperX();
	if(loot == 'bomb' && keeper != null) {
		G.effects().blast(keeper);
		G.effects().shake(6, 500);
	}
}

export default {
	init: function() {
		G = Graphics;
		// Pressing an item asks for it to be used; the engine knows whether it can be now
		inventory = new Inventory(G.board(), function(item) {
			E.trigger('itemPressed', [item]);
		});

		E.bind('pickupLoot', openChest);
		E.bind('lootGained', drawLoot);
		E.bind('lootFound', updateLootButton);
		E.bind('lootUsed', updateLootButton);
		E.bind('lootUsed', drawLootEffect);
		E.bind('gameLoaded', updateLootButtons);

		updateLootButtons();
	}
};

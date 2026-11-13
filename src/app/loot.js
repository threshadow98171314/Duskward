import E from './eventmanager.js';
import GameState from './gamestate.js';
import Content from './gamecontent.js';
import World from './world.js';

var BASE_DROP = 0.05;
var TILE_DROP = 0.15;

function rollForLoot(monster) {
	// %15 chance for normal monster, %15 for every tile after that.
	var chance = (monster.dropChance || BASE_DROP) * 3 + (monster.dropChance || TILE_DROP) * (monster.options.tiles - 3);
	var roll = Math.random();
	if(monster.forceLoot || roll < chance) {
		// Drop loot!
		E.trigger('dropChest', [monster.p(), monster.getLoot()]);
	}
}

function getLoot(treasure, debugMultiplier) {
	var lootName = null;
	var gemDropRate = 0.05;
	if(GameState.dayNumber > (20 / debugMultiplier)) gemDropRate *= 2;
	if(GameState.dayNumber > (40 / debugMultiplier)) gemDropRate *= 2;
	if(treasure.options.forceLoot) {
		lootName = treasure.options.forceLoot;
	} else if(GameState.gem < 4 && Math.random() < gemDropRate * debugMultiplier) {
		lootName = "shard";
	} else {
		var r = Math.random();
		var lootPool = null;
		for(var rarity in Content.lootRarity) {
			if(r < Content.lootRarity[rarity]) {
				lootPool = Content.lootPools[rarity];
				break;
			}
		}
		// Every item in the pool is as likely as the others
		lootName = lootPool[Math.floor(Math.random() * lootPool.length)];
	}
	
	E.trigger("lootGained", [lootName, treasure]);
	if(lootName == "shard") {
		// Shards are special. Maybe abstract this later...
		var num = GameState.gem || 0;
		GameState.gem = ++num > 4 ? 4 : num;
		E.trigger("updateGem");
	} else {
		GameState.count('LOOT', 1);
		var num = GameState.items[lootName] || 0;
		num++;
		var max = Content.LootType[lootName].large ? 1 : 3;
		num = num < max ? num : max;
		GameState.items[lootName] = num;
		E.trigger("lootFound", [lootName, num]);
	}

	treasure.gone = true;
}

export default {
	init: function() {
		E.bind("monsterKilled", rollForLoot, this);
		E.bind("pickupLoot", getLoot, this);
	},
	
	useItem: function(lootName) {
		var num = GameState.items[lootName];
		if(num > 0 && World.canMove()) {
			num--;
			GameState.items[lootName] = num;
			E.trigger('lootUsed', [lootName, num]);
			Content.LootType[lootName].onUse();
		}
	}
};

import { CONTENT, checkContent } from '../content/index.ts';
import { use } from './effects.js';

// The content itself lives in src/content. This module checks it when the game
// loads and gives items, spells and skills the onUse the rest of the game calls.
checkContent(CONTENT);

function usable(defs) {
	var out = {};
	Object.keys(defs).forEach(function(name) {
		out[name] = Object.assign({}, defs[name], {
			onUse: function() {
				use(defs[name].use);
			}
		});
	});
	return out;
}

var Content = {
	ResourceType: CONTENT.resources,
	BuildingType: CONTENT.buildings,
	LootType: usable(CONTENT.items),
	lootRarity: CONTENT.lootRarity,
	lootPools: CONTENT.lootPools,
	StateEffects: CONTENT.stateEffects,
	Spells: usable(CONTENT.spells),
	Skills: usable(CONTENT.skills),

	getResourceType: function(query) {
		for(var c in this.ResourceType) {
			if(query.length == 1 && query == this.ResourceType[c].char || 
					query == this.ResourceType[c].className) {
				return this.ResourceType[c];
			}
		}
		return null;
	},
	
	getBuildingType: function(className) {
		for(var c in this.BuildingType) {
			if(className == this.BuildingType[c].className) {
				return this.BuildingType[c];
			}
		}
		return null;
	}
};

export default Content;

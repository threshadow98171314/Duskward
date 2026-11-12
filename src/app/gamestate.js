import Base64 from '../vendor/base64.js';
import Building from './entity/building.js';
import Block from './entity/block.js';
import E from './eventmanager.js';
import Content from './gamecontent.js';
import { parseSave, serializeSave } from '../platform/save.ts';

var loadedSlot = 0;
var GameState = {
	create: function() {
		this.buildings = [];
		this.stores = [];
		this.level = 1;
		this.xp = 0;
		this.dayNumber = 1;
		this.items = {};
		this.gem = 0;
		this.mana = 0;
		this.counts = {};
		this.prestige = 0;
		this.prioritizedBuilding = null;
		this.storySeen = {};
		this.ward = 0;
		this.gauge = 0;
		this.health = this.maxHealth();
		E.trigger('newGame');
	},
	
	getExportCode: function(slot) {
		try {
			var savedState = localStorage["slot" + slot];
			return savedState ? Base64.encode(savedState) : null;
		} catch(e) {
			return null;
		}
	},
	
	getSlotInfo: function(slot) {
		try {
			var savedState = parseSave(localStorage["slot" + slot]);
			if(savedState) {
				return {
					maxHealth: GameState.maxHealth(savedState.level),
					day: savedState.dayNumber,
					prestiged: savedState.prestige > 0
				};
			}
		} catch(e) {
			// localStorage is unavailable, e.g. in some private browsing modes
		}
		return 'empty';
	},

	load: function(slot) {
		slot = slot || loadedSlot;
		try {
			var savedState = parseSave(localStorage["slot" + slot]);
			if(savedState) {
				this.buildings = [];
				for(var i in savedState.buildings) {
					this.buildings.push(Building.makeBuilding(savedState.buildings[i]));
				}
				this.stores = [];
				for (var i in savedState.stores) {
					this.stores.push(Block.makeBlock(savedState.stores[i]));
				}
				this.items = savedState.items || {};
				this.level = savedState.level;
				this.xp = savedState.xp;
				this.dayNumber = savedState.dayNumber || 1;
				this.gem = savedState.gem || 0;
				this.mana = savedState.mana || 0;
				this.counts = savedState.counts || {};
				this.prestige = savedState.prestige || 0;
				this.health = savedState.health || this.maxHealth();
				this.prioritizedBuilding = savedState.prioritizedBuilding;
				this.storySeen = savedState.storySeen || {};
				this.ward = 0;
				this.gauge = savedState.gauge || 0;
			} else {
				this.create(slot);
			}
		} catch(e) {
			this.create(slot);
		}
		loadedSlot = slot;
		return this;
	},
	
	save: function() {
		if(typeof Storage != 'undefined' && localStorage) {
			var state = {
				buildings: [],
				stores: [],
				level: this.level,
				xp: this.xp,
				dayNumber: this.dayNumber,
				items: this.items,
				gem: this.gem,
				mana: this.mana,
				counts: this.counts,
				prestige: this.prestige,
				health: this.health,
				prioritizedBuilding: this.prioritizedBuilding,
				storySeen: this.storySeen,
				gauge: this.gauge
			};
			for(var b in this.buildings) {
				var building = this.buildings[b];
				state.buildings.push(Building.makeBuilding(building));
			}
			for(var s in this.stores) {
				var store = this.stores[s];
				state.stores.push(Block.makeBlock(store));
			}
			localStorage["slot" + loadedSlot] = serializeSave(state);
		}
		return this;
	},

	// Returns whether the code held a save this version of the game can read
	import: function(slotNum, importCode) {
		try {
			var savedState = parseSave(Base64.decode(importCode));
			if(savedState) {
				localStorage["slot" + slotNum] = serializeSave(savedState);
				return true;
			}
		} catch(e) {
			// localStorage is unavailable
		}
		return false;
	},
	
	deleteSlot: function(slotNum) {
		if(typeof Storage != 'undefined' && localStorage) {
			localStorage.removeItem('slot' + slotNum);
		}
	},
	
	doPrestige: function() {
		this.buildings.length = 0;
		this.stores.length = 0;
		this.prestige = this.prestige ? this.prestige + 1 : 1;
		this.save();
	},
	
	savePersistents: function() {
		if(typeof Storage != 'undefined' && localStorage) {
			var savedState = parseSave(localStorage["slot" + loadedSlot]);
			if(savedState) {
				savedState.counts = this.counts;
				savedState.health = this.health;
				savedState.storySeen = this.storySeen;
				localStorage["slot" + loadedSlot] = serializeSave(savedState);
			}
		}
	},
	
	removeBlock: function(block) {
		this.stores.splice(this.stores.indexOf(block), 1);
	},
	
	hasBase: (function() {
		var _hasBase = false;
		return function() {
			return _hasBase || (function() {
				for(var b in GameState.buildings) {
					var building = GameState.buildings[b];
					if(building.options.type.isBase && building.built) {
						return _hasBase = true;
					}
				}
				return false;
			})();
		};
	})(),
	
	hasBuilding: function(type, ignoreObsolete) {
		for(var i in this.buildings) {
			var building = this.buildings[i];
			if(building.options.type.className == type.className && building.built && 
					(!ignoreObsolete || !building.obsolete)) {
				return true;
			}
		}
		return false;
	},
	
	getBuilding: function(type) {
		for(var i in this.buildings) {
			var building = this.buildings[i];
			if(building.options.type.className == type.className) {
				return building;
			}
		}
		return null;
	},
	
	maxHealth: function(lvl) {
		lvl = lvl || this.level;
		return 20 + 10 * lvl;
	},
	
	maxShield: function() {
		var highestMod = 1;
		for(var i in this.buildings) {
			var building = this.buildings[i];
			if(building.options.type.tileMod == 'wood' && 
					building.options.type.tileLevel > highestMod &&
					building.built) {
				highestMod = building.options.type.tileLevel;
			}
		}
		return 3 * highestMod;
	},
	
	maxSword: function() {
		var highestMod = 1;
		for(var i in this.buildings) {
			var building = this.buildings[i];
			if(building.options.type.tileMod == 'stone' && 
					building.options.type.tileLevel > highestMod &&
					building.built) {
				highestMod = building.options.type.tileLevel;
			}
		}
		// 3, 3, 3, 5, 5, 5, 7, 7, 7...
		return 3 + (Math.floor((highestMod - 1) / 3) * 2);
	},
	
	swordDamage: function() {
		var highestMod = 1;
		for(var i in this.buildings) {
			var building = this.buildings[i];
			if(building.options.type.tileMod == 'stone' && 
					building.options.type.tileLevel > highestMod &&
					building.built) {
				highestMod = building.options.type.tileLevel;
			}
		}
		// 1, 2, 3, 3, 4, 5, 5, 6, 7... ( + punch damage )
		return 1 + (highestMod - 1) - Math.floor((highestMod - 1) / 3);
	},
	
	maxMana: function() {
		return 3;
	},

	// Highest built level of an upgradable building, e.g. 'lighthouse' -> lighthouse3 -> 3
	buildingLevel: function(className) {
		var level = 0;
		for(var i in this.buildings) {
			var building = this.buildings[i];
			var name = building.options.type.className;
			if(building.built && name.indexOf(className) == 0) {
				var n = +(name.substring(className.length) || 1);
				level = n > level ? n : level;
			}
		}
		return level;
	},

	maxWard: function() {
		return 5 + 5 * this.buildingLevel('lighthouse');
	},

	skillLevel: function() {
		return this.buildingLevel('altar');
	},

	maxGauge: function() {
		return 100;
	},
	
	magicEnabled: function() {
		return this.gem >= 4;
	},
	
	count: function(key, num) {
		var value = this.counts[key] || 0;
		value += num;
		this.counts[key] = value;
	},
	
	setIfHigher: function(key, num) {
		if(typeof this.counts == 'undefined') return;
		
		var value = this.counts[key] || 0;
		value = num > value ? num : value;
		this.counts[key] = value;
	}
};

export default GameState;

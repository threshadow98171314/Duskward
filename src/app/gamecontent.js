import E from './eventmanager.js';
import S from './gamestate.js';
import WorldEffect from './entity/worldeffect.js';
import { getModule } from './modules.js';
import B from './gameboard.js';

var Content = {
	
	ResourceType: {
		Grain: {
			char: 'g',
			className: 'grain',
			dragonEffect: 'WingBuffet',
			nightEffect: {
				'castle': 'spawn:demon',
				'fort': 'spawn:earthElemental',
				'house': 'spawn:hauntedArmour',
				'default': 'spawn:zombie'
			},
			multipliers: {
				house: 2,
				fort: 3,
				castle: 4
			},
			effectDest: {
				day: [-20, 10],
				night: 'side'
			}
		},
		Wood: {
			char: 'w',
			className: 'wood',
			nightEffect: {
				'default': 'shield'				
			},
			multipliers: {
				sawmill: 1,
				sawmill2: 1,
				sawmill3: 2,
				sawmill4: 2,
				sawmill5: 2,
				sawmill6: 3,
				sawmill7: 3,
				sawmill8: 3
			},
			effectDest: {
				day: [32, -20],
				night: [-20, -15]
			}
		},
		Stone: {
			char: 's',
			className: 'stone',
			nightEffect: {
				'default': 'sword'
			},
			multipliers: {
				blacksmith: 1,
				blacksmith2: 1,
				blacksmith3: 2,
				blacksmith4: 2,
				blacksmith5: 2,
				blacksmith6: 3,
				blacksmith7: 3,
				blacksmith8: 3
			},
			effectDest: {
				day: [32, -20],
				night: 'sword'
			}
		},
		Clay: {
			char: 'c',
			className: 'clay',
			dragonEffect: 'IceBeam',
			nightEffect: {
				'bricklayer4': 'spawn:imp',
				'bricklayer3': 'spawn:waterElemental',
				'bricklayer2': 'spawn:spider',
				'default': 'spawn:rat'
			},
			multipliers: {
				bricklayer: 1,
				bricklayer2: 2,
				bricklayer3: 3,
				bricklayer4: 4
			},
			effectDest: {
				day: [32, -20],
				night: 'side'
			}
		},
		Cloth: {
			char: 'l',
			className: 'cloth',
			dragonEffect: 'FireBlast',
			nightEffect: {
				'weaver4': 'spawn:warlock',
				'weaver3': 'spawn:fireElemental',
				'weaver2': 'spawn:lizardman',
				'default': 'spawn:skeleton'
			},
			multipliers: {
				weaver: 1,
				weaver2: 2,
				weaver3: 3,
				weaver4: 4
			},
			effectDest: {
				day: [32, -20],
				night: 'side'
			}
		},
		Mana: {
			char: 'm',
			className: 'mana',
			nightEffect: {
				'default': 'spawn:lich',
			},
			multipliers: {},
			effectDest: {
				day: [30, 505],
				night: 'side'
			}
		},
		Lantern: {
			char: 'f',
			className: 'lantern',
			nightEffect: {
				'default': 'dawn'
			},
			multipliers: {},
			effectDest: {
				day: [32, -20],
				night: 'side'
			}
		}
	},
	
	BuildingCallbacks: {
		'shack': function() {
			var e = E;
			e.trigger('resourceStoreChanged', [3, 3]);
		},
		
		'house': function() {
			var e = E;
			e.trigger('resourceStoreChanged', [4, 3]);
		},
		
		'fort': function() {
			var e = E;
			e.trigger('resourceStoreChanged', [4, 4]);
		},
		
		'castle': function() {
			var e = E;
			e.trigger('resourceStoreChanged', [5, 4]);
		},
		
		'tower': function() {
			var e = E;
			e.trigger('enableMagic');
		},

		'lighthouse': function() {
			E.trigger('wardCapacityChanged');
		},

		'lighthouse2': function() {
			E.trigger('wardCapacityChanged');
		},

		'lighthouse3': function() {
			E.trigger('wardCapacityChanged');
		},

		'altar': function() {
			E.trigger('enableSkills');
		},

		'altar2': function() {
			E.trigger('enableSkills');
		},

		'altar3': function() {
			E.trigger('enableSkills');
		}
	},
	
	BuildingType: {
		Shack: {
			className: 'shack',
			spriteName: 'shack',
			position: 30,
			cost: {},
			requiredLevel: 1,
			animationFrames: 1,
			priority: 1,
			isBase: true
		},
		
		House: {
			className: 'house',
			spriteName: 'shack',
			position: 30,
			cost: {},
			requiredLevel: 4,
			prestigeDependency: 'blacksmith',
			animationFrames: 1,
			tileMod: 'grain',
			tileLevel: 2,
			replaces: 'shack',
			defaultAnimation: 1,
			priority: 1,
			isBase: true
		},
		
		Fort: {
			className: 'fort',
			spriteName: 'shack',
			position: 30,
			cost: {},
			requiredLevel: 7,
			prestigeDependency: 'blacksmith3',
			animationFrames: 1,
			tileMod: 'grain',
			tileLevel: 3,
			replaces: 'house',
			defaultAnimation: 2,
			priority: 1,
			isBase: true
		},
		
		Castle: {
			className: 'castle',
			spriteName: 'shack',
			position: 30,
			cost: {},
			requiredLevel: 10,
			prestigeDependency: 'blacksmith6',
			animationFrames: 1,
			tileMod: 'grain',
			tileLevel: 4,
			replaces: 'fort',
			defaultAnimation: 3,
			priority: 1,
			isBase: true
		},
		
		BrickLayer: {
			className: 'bricklayer',
			spriteName: 'bricklayer',
			position: 90,
			cost: {
				stone: 5,
				wood: 5
			},
			requiredLevel: 1,
			priority: 1
		},
		
		Bricklayer2: {
			className: 'bricklayer2',
			spriteName: 'bricklayer',
			position: 90,
			cost: {
				stone: 3,
				wood: 3,
				cloth: 3
			},
			requiredLevel: 1,
			tileMod: 'clay',
			tileLevel: 2,
			replaces: 'bricklayer',
			defaultAnimation: 1,
			priority: 4
		},
		
		Bricklayer3: {
			className: 'bricklayer3',
			spriteName: 'bricklayer',
			position: 90,
			cost: {
				stone: 5,
				wood: 5,
				cloth: 5
			},
			requiredLevel: 1,
			tileMod: 'clay',
			tileLevel: 3,
			replaces: 'bricklayer2',
			defaultAnimation: 2,
			priority: 6
		},
		
		Bricklayer4: {
			className: 'bricklayer4',
			spriteName: 'bricklayer',
			position: 90,
			cost: {
				stone: 8,
				wood: 8,
				cloth: 8
			},
			requiredLevel: 1,
			tileMod: 'clay',
			tileLevel: 4,
			replaces: 'bricklayer3',
			defaultAnimation: 3,
			priority: 9
		},
		
		Weaver: {
			className: 'weaver',
			spriteName: 'weaver',
			position: 150,
			cost: { 
				stone: 5,
				wood: 5
			},
			requiredLevel: 1,
			priority: 2
		},
		
		Weaver2: {
			className: 'weaver2',
			spriteName: 'weaver',
			position: 150,
			cost: {
				wood: 3,
				stone: 3,
				clay: 3
			},
			requiredLevel: 1,
			tileMod: 'cloth',
			tileLevel: 2,
			replaces: 'weaver',
			defaultAnimation: 1,
			priority: 4
		},
		
		Weaver3: {
			className: 'weaver3',
			spriteName: 'weaver',
			position: 150,
			cost: {
				wood: 5,
				stone: 5,
				clay: 5
			},
			requiredLevel: 1,
			tileMod: 'cloth',
			tileLevel: 3,
			replaces: 'weaver2',
			defaultAnimation: 2,
			priority: 6
		},
		
		Weaver4: {
			className: 'weaver4',
			spriteName: 'weaver',
			position: 150,
			cost: {
				wood: 8,
				stone: 8,
				clay: 8
			},
			requiredLevel: 1,
			tileMod: 'cloth',
			tileLevel: 4,
			replaces: 'weaver3',
			defaultAnimation: 3,
			priority: 9
		},
		
		Blacksmith: {
			className: 'blacksmith',
			spriteName: 'blacksmith',
			position: 210,
			cost: {
				wood: 2,
				clay: 2
			},
			requiredLevel: 1,
			tileMod: 'stone',
			tileLevel: 2,
			priority: 3
		},
		
		Blacksmith2: {
			className: 'blacksmith2',
			spriteName: 'blacksmith',
			position: 210,
			cost: {
				wood: 2,
				clay: 5,
				cloth: 5
			},
			requiredLevel: 1,
			tileMod: 'stone',
			tileLevel: 3,
			replaces: 'blacksmith',
			defaultAnimation: 1,
			priority: 5
		},
		
		Blacksmith3: {
			className: 'blacksmith3',
			spriteName: 'blacksmith',
			position: 210,
			cost: {
				wood: 2,
				clay: 8,
				cloth: 8
			},
			requiredLevel: 1,
			tileMod: 'stone',
			tileLevel: 4,
			replaces: 'blacksmith2',
			defaultAnimation: 2,
			priority: 6
		},
		
		Blacksmith4: {
			className: 'blacksmith4',
			spriteName: 'blacksmith',
			position: 210,
			cost: {
				wood: 4,
				clay: 8,
				cloth: 8
			},
			requiredLevel: 1,
			tileMod: 'stone',
			tileLevel: 5,
			replaces: 'blacksmith3',
			defaultAnimation: 3,
			priority: 7
		},
		
		Blacksmith5: {
			className: 'blacksmith5',
			spriteName: 'blacksmith',
			position: 210,
			cost: {
				wood: 6,
				clay: 8,
				cloth: 8
			},
			requiredLevel: 1,
			tileMod: 'stone',
			tileLevel: 6,
			replaces: 'blacksmith4',
			defaultAnimation: 4,
			priority: 8
		},
		
		Blacksmith6: {
			className: 'blacksmith6',
			spriteName: 'blacksmith',
			position: 210,
			cost: {
				wood: 6,
				clay: 10,
				cloth: 10
			},
			requiredLevel: 1,
			tileMod: 'stone',
			tileLevel: 7,
			replaces: 'blacksmith5',
			defaultAnimation: 5,
			priority: 9
		},
		
		Blacksmith7: {
			className: 'blacksmith7',
			spriteName: 'blacksmith',
			position: 210,
			cost: {
				wood: 8,
				clay: 10,
				cloth: 10
			},
			requiredLevel: 1,
			tileMod: 'stone',
			tileLevel: 8,
			replaces: 'blacksmith6',
			defaultAnimation: 6,
			priority: 10
		},
		
		Blacksmith8: {
			className: 'blacksmith8',
			spriteName: 'blacksmith',
			position: 210,
			cost: {
				wood: 10,
				clay: 10,
				cloth: 10
			},
			requiredLevel: 1,
			tileMod: 'stone',
			tileLevel: 9,
			replaces: 'blacksmith7',
			defaultAnimation: 7,
			priority: 11
		},
		
		Sawmill: {
			className: 'sawmill',
			spriteName: 'sawmill',
			position: 270,
			cost: {
				stone: 2,
				cloth: 2
			},
			requiredLevel: 1,
			tileMod: 'wood',
			tileLevel: 2,
			priority: 3
		},
		
		Sawmill2: {
			className: 'sawmill2',
			spriteName: 'sawmill',
			position: 270,
			cost: {
				stone: 2,
				clay: 5,
				cloth: 5
			},
			requiredLevel: 1,
			tileMod: 'wood',
			tileLevel: 3,
			replaces: 'sawmill',
			defaultAnimation: 1,
			priority: 5
		},
		
		Sawmill3: {
			className: 'sawmill3',
			spriteName: 'sawmill',
			position: 270,
			cost: {
				stone: 2,
				clay: 8,
				cloth: 8
			},
			requiredLevel: 1,
			tileMod: 'wood',
			tileLevel: 4,
			replaces: 'sawmill2',
			defaultAnimation: 2,
			priority: 6
		},
		
		Sawmill4: {
			className: 'sawmill4',
			spriteName: 'sawmill',
			position: 270,
			cost: {
				stone: 4,
				clay: 8,
				cloth: 8
			},
			requiredLevel: 1,
			tileMod: 'wood',
			tileLevel: 5,
			replaces: 'sawmill3',
			defaultAnimation: 3,
			priority: 7
		},
		
		Sawmill5: {
			className: 'sawmill5',
			spriteName: 'sawmill',
			position: 270,
			cost: {
				stone: 6,
				clay: 8,
				cloth: 8
			},
			requiredLevel: 1,
			tileMod: 'wood',
			tileLevel: 6,
			replaces: 'sawmill4',
			defaultAnimation: 4,
			priority: 8
		},
		
		Sawmill6: {
			className: 'sawmill6',
			spriteName: 'sawmill',
			position: 270,
			cost: {
				stone: 6,
				clay: 10,
				cloth: 10
			},
			requiredLevel: 1,
			tileMod: 'wood',
			tileLevel: 7,
			replaces: 'sawmill5',
			defaultAnimation: 5,
			priority: 9
		},
		
		Sawmill7: {
			className: 'sawmill7',
			spriteName: 'sawmill',
			position: 270,
			cost: {
				stone: 8,
				clay: 10,
				cloth: 10
			},
			requiredLevel: 1,
			tileMod: 'wood',
			tileLevel: 8,
			replaces: 'sawmill6',
			defaultAnimation: 6,
			priority: 10
		},
		
		Sawmill8: {
			className: 'sawmill8',
			spriteName: 'sawmill',
			position: 270,
			cost: {
				stone: 10,
				clay: 10,
				cloth: 10
			},
			requiredLevel: 1,
			tileMod: 'wood',
			tileLevel: 9,
			replaces: 'sawmill7',
			defaultAnimation: 7,
			priority: 11
		},
		
		Tower: {
			className: 'tower',
			spriteName: 'tower',
			position: 330,
			cost: {},
			requiredLevel: 1,
			priority: 1,
			test: function(State) {
				return State.gem >= 4;
			}
		},

		Lighthouse: {
			className: 'lighthouse',
			spriteName: 'lighthouse',
			position: 390,
			cost: {
				stone: 4,
				wood: 4,
				clay: 2
			},
			requiredLevel: 3,
			priority: 4
		},

		Lighthouse2: {
			className: 'lighthouse2',
			spriteName: 'lighthouse',
			position: 390,
			cost: {
				stone: 6,
				clay: 4,
				lantern: 4
			},
			requiredLevel: 1,
			tileMod: 'lantern',
			tileLevel: 2,
			replaces: 'lighthouse',
			defaultAnimation: 1,
			priority: 7
		},

		Lighthouse3: {
			className: 'lighthouse3',
			spriteName: 'lighthouse',
			position: 390,
			cost: {
				stone: 8,
				cloth: 6,
				lantern: 8
			},
			requiredLevel: 1,
			tileMod: 'lantern',
			tileLevel: 3,
			replaces: 'lighthouse2',
			defaultAnimation: 2,
			priority: 10
		},

		Altar: {
			className: 'altar',
			spriteName: 'altar',
			position: 450,
			cost: {
				stone: 3,
				cloth: 3,
				lantern: 3
			},
			requiredLevel: 1,
			requires: 'lighthouse',
			priority: 5
		},

		Altar2: {
			className: 'altar2',
			spriteName: 'altar',
			position: 450,
			cost: {
				wood: 6,
				cloth: 6,
				lantern: 6
			},
			requiredLevel: 1,
			replaces: 'altar',
			defaultAnimation: 1,
			priority: 8
		},

		Altar3: {
			className: 'altar3',
			spriteName: 'altar',
			position: 450,
			cost: {
				clay: 8,
				cloth: 8,
				lantern: 10
			},
			requiredLevel: 1,
			replaces: 'altar2',
			defaultAnimation: 2,
			priority: 11
		}
	},
	
	LootType: {
		healthPotion: {
			onUse: function() {
				E.trigger('healDude', [Math.floor(S.maxHealth() / 2)]);
				E.trigger('heal');
			}
		},
		manaPotion: {
			onUse: function() {
				E.trigger('gainMana', [Math.floor(S.maxMana() / 2)]);
			}
		},
		bomb: {
			onUse: function() {
				E.trigger('damageAll', [20]);
				E.trigger('bomb');
			}
		},
		equipment: {
			onUse: function() {
				E.trigger('fillEquipment');
			}
		},
		callDragon: {
			large: true,
			onUse: function() {
				E.trigger('callDragon');
			}
		}
	},
	
	lootPools: {
		rare: ['bomb'],
		uncommon: ['equipment'],
		common: ['healthPotion']
	},
	
	StateEffects: {
		freezeTime: {
			className: 'freezeTime',
			duration: 15000
		},
		haste: {
			className: 'haste',
			duration: 30000
		},
		timelamp: {
			className: 'freezeTime',
			duration: 10000
		},
		frozen: {
			className: 'frozen',
			duration: 8000,
			start: function(entity) {
				entity.paused = true;
				if(this._worldEffect == null) {
					this._worldEffect = new WorldEffect({effectClass: 'iceBlock', spriteName: 'dragoneffects'});
					this._worldEffect.p(entity.p());
					E.trigger('newEntity', [this._worldEffect]);
				}
			},
			end: function(entity) {
				entity.paused = false;
				E.trigger('removeEntity', [this._worldEffect]);
				this._worldEffect = null;
			}
		}
	},
	
	Spells: {
		resetBoard: {
			onUse: function() {
				E.trigger('refreshBoard');
				E.trigger('refreshBoardSpell');
			}
		},
		haste: {
			onUse: function() {
				var C = Content;
				E.trigger('newStateEffect', [C.StateEffects.haste]);
				E.trigger('haste');
			}
		},
		phaseChange: {
			onUse: function() {
				E.trigger('phaseChange', [!getModule('engine').isNight()]);
				E.trigger('phaseChangeSpell');
			}
		},
		freezeTime: {
			onUse: function() {
				var C = Content;
				E.trigger('newStateEffect', [C.StateEffects.freezeTime]);
				E.trigger('freezeTime');
			}
		}
	},
	
	// Dusk skills, unlocked by the Altar of Dawn and cast with a full Afterglow gauge
	Skills: {
		dawnlight: {
			level: 1,
			onUse: function() {
				if(getModule('engine').isNight()) {
					E.trigger('damageAll', [10]);
				} else {
					E.trigger('dawnlightHarvest', [2]);
				}
				E.trigger('dawnlight');
			}
		},
		wardcraft: {
			level: 2,
			onUse: function() {
				E.trigger('fillWard');
				E.trigger('healDude', [Math.floor(S.maxHealth() / 4)]);
				E.trigger('heal');
			}
		},
		timelamp: {
			level: 3,
			onUse: function() {
				var C = Content;
				if(getModule('engine').isNight()) {
					E.trigger('newStateEffect', [C.StateEffects.timelamp]);
					E.trigger('freezeTime');
				} else {
					E.trigger('extendDay', [5]);
				}
			}
		}
	},

	TileEffects: {
		// Left by clearing four tiles at once. Clears its row and column when matched.
		lanternPower: {
			permanent: true,
			onMatch: function(row, column) {
				var tileMods = [];
				for(var r = 0; r < B.options.rows; r++) {
					tileMods.push({ row: r, column: column, effect: 'collect' });
				}
				for(var c = 0; c < B.options.columns; c++) {
					tileMods.push({ row: row, column: c, effect: 'collect' });
				}
				E.trigger('lanternBurst', [{ row: row, column: column }]);
				return tileMods;
			}
		},
		// Left by clearing five or more tiles at once. Clears every tile of its kind when matched.
		sunPower: {
			permanent: true,
			onMatch: function(row, column, tileChar) {
				E.trigger('sunBurst', [{ row: row, column: column }]);
				return B.findTiles(tileChar).map(function(pos) {
					return { row: pos.row, column: pos.col, effect: 'collect' };
				});
			}
		},
		// Cast by shades at night. The tile can't be moved until a neighbour is cleared.
		shadowBind: {
			permanent: true,
			immovable: true,
			onMatch: function() {
				return [];
			}
		},
		explosive: {
			duration: 5,
			onMatch: function(row, column) {
				// a'splode!
				var tileMods = [];
				for(var r = -1; r < 2; r++) {
					if(row + r < 0 || row + r >= B.options.rows) continue;
					for(var c = -1; c < 2; c++) {
						if(column + c < 0 || column + c >= B.options.columns) continue;
						tileMods.push({
							row: row + r,
							column: column + c,
							effect: 'remove'
						});
					}
				}
				E.trigger("hurtDude", [30]);
				E.trigger("tileExplode", [{row: row, column: column}]);
				
				return tileMods;
			}
		}
	},
	
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
	},
	
	getEffectType: function(effectString) {
		return this.TileEffects[effectString];
	}
};

export default Content;

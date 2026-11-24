import { SHEETS, SPRITES } from '../../content/sprites.ts';

// Sprite sheets and where each sprite is on them, from the list the art tools write
// (src/content/sprites.ts). Entities draw from their sheet by background position.

var spritesheets = {};
function loadSheets() {
	for(var sheet in SHEETS) {
		loadSheet(sheet);
	}
}

function loadSheet(sheetName) {
	spritesheets[sheetName] = false;
	var spriteImage = new Image();
	spriteImage.onload = function() {
		spritesheets[sheetName] = true;
	};
	spriteImage.src = SHEETS[sheetName].file;
}

function getInfo(spriteName) {
	var sprite = SPRITES[spriteName];
	return sprite ? [sprite.sheet, sprite.y] : [null, 0];
}

// Preload all the spritesheets
loadSheets();

export default {
	getOffset: function(spriteName) {
		return getInfo(spriteName)[1];
	},
	getFilename: function(spriteName) {
		return getInfo(spriteName)[0];
	},
	isReady: function() {
		for(var sheet in spritesheets) {
			if(!spritesheets[sheet]) {
				return false;
			}
		}
		return true;
	}
};

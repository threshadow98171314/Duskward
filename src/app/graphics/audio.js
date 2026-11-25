import E from '../eventmanager.js';
import Options from '../gameoptions.js';
import Graphics from './graphics.js';
import { VolumeSliders } from '../../ui/menu.ts';

// The volume sliders in the menu (src/ui/menu.ts)

var sliders = null;

export default {
	init: function() {
		if(sliders) {
			sliders.remove();
		}
		sliders = new VolumeSliders(function(volume, level) {
			E.trigger(volume == 'music' ? 'setMusicVolume' : 'setEffectsVolume', [level]);
		});
		Graphics.addToMenu(sliders.element);
		sliders.set('music', Options.get('musicVolume'));
		sliders.set('effects', Options.get('effectsVolume'));
	}
};

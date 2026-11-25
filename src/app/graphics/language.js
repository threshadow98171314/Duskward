import O from '../gameoptions.js';
import Graphics from './graphics.js';
import { languageMenu } from '../../ui/menu.ts';

// The languages in the menu (src/ui/menu.ts)

var LANGUAGES = [
	{ code: 'zh-TW', name: '繁體中文' },
	{ code: 'en', name: 'English' }
];

var _el = null;

function chooseLanguage(code) {
	if(code != Graphics.getLocale()) {
		O.set('language', code);
		// Text is drawn once at startup, so reload to apply the new language
		window.location.reload();
	}
}

export default {
	init: function() {
		if(_el) {
			_el.remove();
		}
		_el = languageMenu(Graphics.getText('LANGUAGE'), LANGUAGES, Graphics.getLocale(), chooseLanguage);
		Graphics.addToMenu(_el);
	}
};

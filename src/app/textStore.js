import en from './locale/en.js';
import zhTW from './locale/zh-TW.js';

var DEFAULT_LOCALE = 'zh-TW';
var LOCALES = { 'en': en, 'zh-TW': zhTW };

var TextStore = function(locale) {
	locale = LOCALES.hasOwnProperty(locale) ? locale : DEFAULT_LOCALE;
	this.localeName = locale;
	this.locale = LOCALES[locale];
};

// Picks a locale from the browser's language list, falling back to Traditional Chinese
TextStore.detectLocale = function() {
	var langs = navigator.languages || [navigator.language || navigator.userLanguage || ''];
	for(var i = 0; i < langs.length; i++) {
		if(/^zh/i.test(langs[i])) {
			return 'zh-TW';
		}
		if(/^en/i.test(langs[i])) {
			return 'en';
		}
	}
	return DEFAULT_LOCALE;
};

// Extra arguments fill {0}, {1}, ... placeholders in the text
TextStore.prototype.get = function(key) {
	var text = this.locale[key];
	if(arguments.length > 1 && typeof text == 'string') {
		var args = arguments;
		text = text.replace(/\{(\d+)\}/g, function(match, index) {
			return args[+index + 1];
		});
	}
	return text;
};

TextStore.prototype.isReady = function() {
	return this.locale != null;
};

export default TextStore;

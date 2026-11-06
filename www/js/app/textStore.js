define(function() {
	
	var DEFAULT_LOCALE = 'zh-TW';

	var TextStore = function(locale) {
		var _this = this;
		locale = locale || DEFAULT_LOCALE;
		this.localeName = locale;
		require(['app/locale/' + locale], function(l) {
			_this.locale = l;
		});
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
	
	return TextStore;
});

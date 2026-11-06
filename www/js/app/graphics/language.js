define(['app/gameoptions'], function(O) {

	var LANGUAGES = [
		{ code: 'zh-TW', name: '繁體中文' },
		{ code: 'en', name: 'English' }
	];

	var G = null, _el = null;

	function el() {
		if(_el == null) {
			G.addStyleRule('.language:before', 'content:"- ' + G.getText('LANGUAGE') + ' -";');
			_el = G.make('language submenu', 'ul');
			LANGUAGES.forEach(function(lang) {
				G.make('litBorder', 'li')
					.text(lang.name)
					.toggleClass('selected', lang.code == G.getLocale())
					.on('click touchstart', function() {
						chooseLanguage(lang.code);
						return false;
					})
					.appendTo(_el);
			});
			G.addToMenu(_el);
		}
		return _el;
	}

	function chooseLanguage(code) {
		if(code != G.getLocale()) {
			O.set('language', code);
			// Text is drawn once at startup, so reload to apply the new language
			window.location.reload();
		}
	}

	return {
		init: function() {
			G = require('app/graphics/graphics');
			if(_el) {
				_el.remove();
			}
			_el = null;
			el();
		}
	};
});

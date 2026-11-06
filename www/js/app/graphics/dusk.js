define(['jquery', 'app/eventmanager', 'app/gamestate'], function($, E, State) {

	var BURST_TIME = 700;

	var _ward = null;

	function G() {
		return require('app/graphics/graphics');
	}

	function ward() {
		if(_ward == null) {
			_ward = G().make('ward hidden')
				.append(G().make('fill'))
				.append(G().make('wardValue'));
			G().getStatusContainer().append(_ward);
		}
		return _ward;
	}

	function updateWard(current, max) {
		var el = ward();
		el.find('.fill').css('height', (max > 0 ? current / max * 100 : 0) + '%');
		el.find('.wardValue').text(current);
		el.toggleClass('hidden', !(current > 0));
	}

	function notice(text, className) {
		var el = $('<div>').addClass('dayNotifier ' + className).text(text).appendTo('.world');
		setTimeout(function() {
			el.addClass('hidden');
		}, 2000);
		setTimeout(function() {
			el.remove();
		}, 2500);
	}

	function duskFall() {
		$('body').addClass('dusk');
		notice(G().getText('DUSK'), 'duskNotifier');
	}

	function duskLift() {
		$('body').removeClass('dusk');
	}

	function chainCombo(chain) {
		var popup = G().make('chainPopup').text(G().getText('CHAIN_N', chain)).appendTo('.gameBoard');
		setTimeout(function() {
			popup.remove();
		}, 1200);
	}

	// Flashes over board cells; tiles are laid out on a uniform grid inside the tile container
	function flash(className, css) {
		var el = G().make('burst ' + className).css(css).appendTo('.tileContainer');
		setTimeout(function() {
			el.remove();
		}, BURST_TIME);
	}

	function lanternBurst(pos) {
		var size = $('.tile').first().outerWidth();
		flash('lanternRow', { top: pos.row * size + 'px', height: size + 'px' });
		flash('lanternColumn', { left: pos.column * size + 'px', width: size + 'px' });
	}

	function sunBurst() {
		flash('sunFlash', {});
	}

	return {
		init: function() {
			_ward = null;
			$('body').removeClass('dusk');
			E.bind('wardChanged', updateWard);
			E.bind('duskFall', duskFall);
			E.bind('duskLift', duskLift);
			E.bind('chainCombo', chainCombo);
			E.bind('lanternBurst', lanternBurst);
			E.bind('sunBurst', sunBurst);
		}
	};
});

import $ from '../../vendor/jquery.js';
import E from '../eventmanager.js';
import State from '../gamestate.js';
import Graphics from './graphics.js';


var _ward = null;
var _chainPopup = null;

function G() {
	return Graphics;
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
	// One popup at a time, so fast chains do not pile them up
	if(_chainPopup != null) {
		_chainPopup.remove();
	}
	var popup = _chainPopup = G().make('chainPopup').text(G().getText('CHAIN_N', chain)).appendTo('.gameBoard');
	setTimeout(function() {
		popup.remove();
		if(_chainPopup == popup) {
			_chainPopup = null;
		}
	}, 1200);
}

function bounty(kinds, percent) {
	var popup = G().make('bountyPopup').text(G().getText('BOUNTY_N', kinds, percent)).appendTo('.gameBoard');
	setTimeout(function() {
		popup.remove();
	}, 2000);
}

// Light runs along a burst lantern tile's row and down its column
function lanternBurst(pos) {
	G().effects().lanternBurst(pos.row, pos.column);
	G().effects().shake(2, 200);
}

function sunBurst() {
	G().effects().sunBurst();
	G().effects().shake(3, 300);
}

export default {
	init: function() {
		_ward = null;
		_chainPopup = null;
		$('body').removeClass('dusk');
		E.bind('wardChanged', updateWard);
		E.bind('duskFall', duskFall);
		E.bind('duskLift', duskLift);
		E.bind('chainCombo', chainCombo);
		E.bind('bounty', bounty);
		E.bind('lanternBurst', lanternBurst);
		E.bind('sunBurst', sunBurst);
	}
};

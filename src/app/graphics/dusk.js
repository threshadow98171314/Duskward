import E from '../eventmanager.js';
import Graphics from './graphics.js';

// Dusk and what comes with it: the word that it has fallen, the ward raised against
// the night, and the pop-ups of chains and bounties over the board; also the bursts
// of the lantern and sun tiles. The status and the notices are drawn by src/ui.

function G() {
	return Graphics;
}

function updateWard(current, max) {
	G().status().setWard(current, max);
}

function duskFall() {
	document.body.classList.add('dusk');
	G().notices().dusk(G().getText('DUSK'));
}

function duskLift() {
	document.body.classList.remove('dusk');
}

function chainCombo(chain) {
	G().notices().chainCombo(G().getText('CHAIN_N', chain));
}

function bounty(kinds, percent) {
	G().notices().bounty(G().getText('BOUNTY_N', kinds, percent));
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
		document.body.classList.remove('dusk');
		E.bind('wardChanged', updateWard);
		E.bind('duskFall', duskFall);
		E.bind('duskLift', duskLift);
		E.bind('chainCombo', chainCombo);
		E.bind('bounty', bounty);
		E.bind('lanternBurst', lanternBurst);
		E.bind('sunBurst', sunBurst);
	}
};

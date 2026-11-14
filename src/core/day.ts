// The day and night clock. Time moves with the player's moves rather than the
// wall clock: every swap by day, every monster slain and every lantern lit by
// night. The last moves of each day are dusk, when the ward can be raised.

export interface Clock {
	night: boolean;
	// Moves made in the current day or night
	position: number;
	dusk: boolean;
}

export interface ClockLengths {
	dayMoves: number;
	nightMoves: number;
}

export const DUSK_MOVES = 5;

export function createClock(): Clock {
	return { night: false, position: 0, dusk: false };
}

export function phaseLength(clock: Clock, lengths: ClockLengths): number {
	return clock.night ? lengths.nightMoves : lengths.dayMoves;
}

// Moves time on. When the day or night is over, the caller starts the next one.
export function advanceClock(clock: Clock, lengths: ClockLengths, steps: number): { over: boolean; duskChanged: boolean } {
	clock.position += steps;
	if (clock.position >= phaseLength(clock, lengths)) {
		return { over: true, duskChanged: false };
	}
	return { over: false, duskChanged: updateDusk(clock, lengths) };
}

// Turns time back by day, e.g. with the time lamp. Returns whether dusk changed.
export function extendDay(clock: Clock, lengths: ClockLengths, steps: number): boolean {
	if (clock.night) {
		return false;
	}
	clock.position = Math.max(0, clock.position - steps);
	return updateDusk(clock, lengths);
}

// Starts a day or a night from its first move. Returns whether dusk changed.
export function startPhase(clock: Clock, lengths: ClockLengths, night: boolean): boolean {
	clock.night = night;
	clock.position = 0;
	return updateDusk(clock, lengths);
}

function updateDusk(clock: Clock, lengths: ClockLengths): boolean {
	const dusk = !clock.night && clock.position >= lengths.dayMoves - DUSK_MOVES;
	if (dusk === clock.dusk) {
		return false;
	}
	clock.dusk = dusk;
	return true;
}

// The Eclipse eats a little more of the sun every day until the keeper takes it
// back: how much of it is gone after so many days, from 0 (whole) up to
// SUN_BITE_MOST, since a thin crescent always holds out
export const SUN_BITE_PER_DAY = 0.02;
export const SUN_BITE_MOST = 0.8;

export function sunBite(days: number): number {
	return Math.min(SUN_BITE_MOST, Math.max(0, days) * SUN_BITE_PER_DAY);
}

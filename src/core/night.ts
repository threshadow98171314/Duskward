// Monsters that come at night for reasons other than the tiles the keeper gathers:
// a long chain calls up a shade, and crows gather at nightfall once the village
// is big enough to be noticed. The calls themselves are content (src/content/monsters.ts).

export type Call =
	// A chain at night reaching this many waves calls the monster, once per move
	| { monster: string; when: 'chain'; waves: number }
	// At nightfall from this day on, a flock that grows by one every few days, up to a limit
	| { monster: string; when: 'nightfall'; fromDay: number; flock: number; growEvery: number; most: number };

export function chainCalls(calls: Call[], waves: number): string[] {
	return calls.filter((call) => call.when === 'chain' && call.waves === waves).map((call) => call.monster);
}

export function nightfallCalls(calls: Call[], day: number): { monster: string; count: number }[] {
	const arrivals: { monster: string; count: number }[] = [];
	for (const call of calls) {
		if (call.when === 'nightfall' && day >= call.fromDay) {
			arrivals.push({
				monster: call.monster,
				count: Math.min(call.most, call.flock + Math.floor((day - call.fromDay) / call.growEvery)),
			});
		}
	}
	return arrivals;
}

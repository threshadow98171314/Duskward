// What a match gathers flies off the board to where it goes, shrinking on the way:
// to the stockpile, the keeper's sword, or off one side of the world. Each one is a
// square of the style sheets' .resourceEffect, coloured for its kind of resource;
// the squares are kept and used again.

import { element, settle } from './dom.ts';

// How long a square takes to get there (the style sheet's transition)
const FLIGHT_MS = 700;

export class ResourceFlights {
	private readonly spare: HTMLElement[] = [];

	// The squares fly over the board, laid out in cells this big
	constructor(private readonly board: HTMLElement, private readonly cell: number) {}

	// Sends a square of a kind of resource from a cell of the board to a point, both
	// measured from the board's top left
	send(row: number, column: number, kind: string, to: [number, number]): void {
		const square = this.spare.pop() ?? this.board.appendChild(element('div'));
		square.className = 'resourceEffect ' + kind;
		square.style.transform = translate((column + 0.5) * this.cell, (row + 0.5) * this.cell, 1);
		settle(square);
		square.style.transform = translate(to[0], to[1], 0.2);
		setTimeout(() => {
			square.className = 'resourceEffect pooled';
			this.spare.push(square);
		}, FLIGHT_MS);
	}
}

function translate(x: number, y: number, scale: number): string {
	return 'translate3d(' + x + 'px, ' + y + 'px, 0px) scale(' + scale + ')';
}

import { describe, expect, it } from 'vitest';
import { EclipseView } from '../src/render/eclipse.ts';

// The Eclipse, come down at the start of the test's clock, which the test moves
function eclipseView() {
	const clock = { now: 1000 };
	const view = new EclipseView({ x: 242, y: 38 }, () => clock.now);
	return { view, clock };
}

describe('the Eclipse', () => {
	it('comes down as a faint speck, and grows into its full size and darkness', () => {
		const { view, clock } = eclipseView();
		expect(view.look(clock.now)).toEqual({ scale: 0.3, alpha: 0, brightness: 1, saturation: 1 });
		clock.now += 300;
		expect(view.look(clock.now).scale).toBeCloseTo(0.3 + 0.7 * 0.75);
		clock.now += 300;
		expect(view.look(clock.now)).toMatchObject({ scale: 1, alpha: 0.4 });
		clock.now += 900;
		expect(view.look(clock.now)).toEqual({ scale: 1, alpha: 1, brightness: 1, saturation: 1 });
	});

	it('eases into a mood, holds it for as long as it lasts, and eases out of it again', () => {
		const { view, clock } = eclipseView();
		clock.now = 5000;
		view.feel('flare', 600);
		clock.now += 150;
		expect(view.look(clock.now).brightness).toBeCloseTo(1.3);
		clock.now += 150;
		expect(view.look(clock.now).brightness).toBeCloseTo(1.6);
		clock.now += 450;
		expect(view.look(clock.now).brightness).toBeCloseTo(1.3);
		clock.now += 150;
		expect(view.look(clock.now)).toEqual({ scale: 1, alpha: 1, brightness: 1, saturation: 1 });
	});

	it('dims and greys as it eclipses the board, flinching and flaring while lantern light pierces it', () => {
		const { view, clock } = eclipseView();
		clock.now = 5000;
		view.feel('darken', 1200);
		clock.now += 300;
		expect(view.look(clock.now)).toEqual({ scale: 1, alpha: 1, brightness: 0.5, saturation: 0.4 });
		view.feel('struck', 300);
		clock.now += 300;
		const look = view.look(clock.now);
		expect(look.brightness).toBeCloseTo(2.2);
		expect(look.saturation).toBeCloseTo(1);
		expect(look.scale).toBeCloseTo(0.92);
		// Over that, it is still dark
		clock.now += 300;
		expect(view.look(clock.now)).toEqual({ scale: 1, alpha: 1, brightness: 0.5, saturation: 0.4 });
	});

	it('swells, burns brighter and fades away as it breaks apart', () => {
		const { view, clock } = eclipseView();
		clock.now = 5000;
		view.breakApart();
		clock.now += 1750;
		const look = view.look(clock.now);
		expect(look.scale).toBeCloseTo(1.35);
		expect(look.alpha).toBeCloseTo(0.75);
		expect(look.brightness).toBeCloseTo(2);
		clock.now += 1750;
		expect(view.look(clock.now)).toMatchObject({ alpha: 0, brightness: 3 });
		expect(view.look(clock.now).scale).toBeCloseTo(2.4);
	});
});

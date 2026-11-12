import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventManager from '../src/app/eventmanager.js';

beforeEach(() => {
	EventManager.init();
});

describe('EventManager', () => {
	it('calls every listener with the trigger parameters', () => {
		const first = vi.fn();
		const second = vi.fn();
		EventManager.bind('hit', first);
		EventManager.bind('hit', second);
		EventManager.trigger('hit', [3, 'sword']);
		expect(first).toHaveBeenCalledWith(3, 'sword');
		expect(second).toHaveBeenCalledWith(3, 'sword');
	});

	it('ignores events nobody listens to', () => {
		expect(() => EventManager.trigger('nothing', [])).not.toThrow();
	});

	it('unbinds a single callback', () => {
		const kept = vi.fn();
		const removed = vi.fn();
		EventManager.bind('hit', kept);
		EventManager.bind('hit', removed);
		EventManager.unbind('hit', null, removed);
		EventManager.trigger('hit', []);
		expect(kept).toHaveBeenCalled();
		expect(removed).not.toHaveBeenCalled();
	});

	it('unbinds the listener of a given binder', () => {
		const owner = {};
		const kept = vi.fn();
		const removed = vi.fn();
		EventManager.bind('hit', kept, {});
		EventManager.bind('hit', removed, owner);
		EventManager.unbind('hit', owner);
		EventManager.trigger('hit', []);
		expect(kept).toHaveBeenCalled();
		expect(removed).not.toHaveBeenCalled();
	});

	it('unbinds every listener of an event', () => {
		const listener = vi.fn();
		EventManager.bind('hit', listener);
		EventManager.unbind('hit');
		EventManager.trigger('hit', []);
		expect(listener).not.toHaveBeenCalled();
	});
});

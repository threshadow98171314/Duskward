import { describe, expect, it, vi } from 'vitest';

// main.js starts the game, so it is left out; everything it imports is covered
const modules = import.meta.glob('../src/app/**/*.js');
const entries = Object.keys(modules).filter((path) => !path.endsWith('/main.js'));

describe('module graph', () => {
	it('loads the whole game through the engine', async () => {
		const { default: Engine } = await import('../src/app/engine.js');
		expect(Engine.init).toBeTypeOf('function');
	});

	it('registers every module that is looked up late', async () => {
		await import('../src/app/engine.js');
		const { getModule } = await import('../src/app/modules.js');
		for (const name of ['engine', 'world', 'graphics/graphics', 'audio/audio', 'action/actionfactory']) {
			expect(getModule(name), name).toBeTypeOf('object');
		}
		expect(() => getModule('missing')).toThrow('has not loaded yet');
	});

	// Each module should also load when it is the first one imported. Note: a deliberate
	// load-order bug did not make this fail, so it is not yet proof against cycles.
	it.each(entries)('loads %s on its own', async (path) => {
		vi.resetModules();
		await expect(modules[path]()).resolves.toBeDefined();
	});
});

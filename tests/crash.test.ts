import { afterEach, describe, expect, it, vi } from 'vitest';
import { installCrashScreen } from '../src/ui/crash.ts';

let uninstall: (() => void) | null = null;

afterEach(() => {
	uninstall?.();
	uninstall = null;
	document.body.innerHTML = '';
	localStorage.clear();
});

const fail = (message: string, filename = location.href) =>
	window.dispatchEvent(new ErrorEvent('error', { error: new Error(message), message, filename }));

describe('the crash screen', () => {
	it('appears for an uncaught error, with the details', () => {
		uninstall = installCrashScreen();
		fail('the board broke');
		const screen = document.querySelector('.crashScreen');
		expect(screen).not.toBeNull();
		expect(screen!.getAttribute('role')).toBe('alertdialog');
		expect(screen!.querySelector('pre')!.textContent).toContain('the board broke');
	});

	it('appears only once', () => {
		uninstall = installCrashScreen();
		fail('first');
		fail('second');
		expect(document.querySelectorAll('.crashScreen')).toHaveLength(1);
		expect(document.querySelector('.crashScreen pre')!.textContent).toContain('first');
	});

	it('reloads the game from its button', () => {
		const reload = vi.fn();
		uninstall = installCrashScreen({ reload });
		fail('boom');
		(document.querySelector('.crashReload') as HTMLButtonElement).click();
		expect(reload).toHaveBeenCalledOnce();
	});

	it('covers rejected promises too', () => {
		uninstall = installCrashScreen();
		window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('lost save') }));
		expect(document.querySelector('.crashScreen pre')!.textContent).toContain('lost save');
	});

	it('ignores errors that do not come from the game', () => {
		uninstall = installCrashScreen();
		fail('from an extension', 'chrome-extension://abc/content.js');
		fail('Script error.', '');
		fail('ResizeObserver loop completed with undelivered notifications.');
		expect(document.querySelector('.crashScreen')).toBeNull();
	});

	it('speaks the language the player picked', () => {
		localStorage.setItem('gameOptions', JSON.stringify({ language: 'en' }));
		uninstall = installCrashScreen();
		fail('boom');
		expect(document.querySelector('.crashScreen h2')!.textContent).toBe('Something went wrong');
	});

	it('defaults to Traditional Chinese', () => {
		const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR']);
		uninstall = installCrashScreen();
		fail('boom');
		expect(document.querySelector('.crashScreen h2')!.textContent).toBe('遊戲出了點問題');
		languages.mockRestore();
	});
});

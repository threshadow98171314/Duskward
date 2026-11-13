// The crash screen.
//
// An error that gets past the game's own code usually leaves it stuck: the board
// stops answering, or the screen freezes halfway through a transition. Instead of
// leaving the player there, this explains what happened, says where the save
// stands, and offers a reload, with the error details ready to copy for a report.
// It depends on nothing else in the game, so it still works when the game is broken.

const TEXT = {
	'zh-TW': {
		title: '遊戲出了點問題',
		body: '存檔停在最近一次天亮時的進度，重新載入就能從那裡繼續。',
		reload: '重新載入',
		details: '錯誤內容',
		copy: '複製',
		copied: '已複製',
	},
	en: {
		title: 'Something went wrong',
		body: 'Your game was last saved at daybreak. Reload to carry on from there.',
		reload: 'Reload',
		details: 'Error details',
		copy: 'Copy',
		copied: 'Copied',
	},
};

type Language = keyof typeof TEXT;

export interface CrashOptions {
	// Tests replace the page reload
	reload?: () => void;
}

// Shows the crash screen for uncaught errors and rejected promises. Returns a
// function that stops listening.
export function installCrashScreen(options: CrashOptions = {}): () => void {
	const onError = (event: ErrorEvent) => {
		if (!isNoise(event)) {
			showCrashScreen(describe(event.error ?? event.message), options);
		}
	};
	const onRejection = (event: PromiseRejectionEvent) => {
		showCrashScreen(describe(event.reason), options);
	};
	window.addEventListener('error', onError);
	window.addEventListener('unhandledrejection', onRejection);
	return () => {
		window.removeEventListener('error', onError);
		window.removeEventListener('unhandledrejection', onRejection);
	};
}

export function showCrashScreen(details: string, options: CrashOptions = {}): void {
	if (document.querySelector('.crashScreen')) {
		// The first error is the one that matters; later ones usually follow from it
		return;
	}
	const text = TEXT[language()];
	addStyle();

	const screen = element('div', 'crashScreen');
	screen.setAttribute('role', 'alertdialog');
	screen.setAttribute('aria-labelledby', 'crashTitle');
	screen.setAttribute('aria-describedby', 'crashBody');
	const panel = element('div', 'crashPanel');
	const title = element('h2', '', text.title);
	title.id = 'crashTitle';
	const body = element('p', '', text.body);
	body.id = 'crashBody';
	const reload = element('button', 'crashReload', text.reload) as HTMLButtonElement;
	reload.type = 'button';
	reload.addEventListener('click', () => (options.reload ?? (() => location.reload()))());

	const more = element('details', 'crashDetails');
	more.append(element('summary', '', text.details));
	const report = element('pre', '', details + '\n\n' + navigator.userAgent);
	const copy = element('button', 'crashCopy', text.copy) as HTMLButtonElement;
	copy.type = 'button';
	copy.addEventListener('click', () => {
		const copied = () => {
			copy.textContent = text.copied;
		};
		navigator.clipboard?.writeText(report.textContent ?? '').then(copied, () => selectText(report));
		if (!navigator.clipboard) {
			selectText(report);
		}
	});
	more.append(report, copy);

	panel.append(title, body, reload, more);
	screen.append(panel);
	document.body.append(screen);
	reload.focus();
}

function describe(error: unknown): string {
	if (error instanceof Error) {
		return error.stack && error.stack.includes(error.message) ? error.stack : error.message + '\n' + (error.stack ?? '');
	}
	return String(error);
}

// Errors that do not come from the game: browser extensions, scripts from other
// sites, and the harmless ResizeObserver warning
function isNoise(event: ErrorEvent): boolean {
	if (event.message === 'Script error.' || /ResizeObserver loop/.test(event.message)) {
		return true;
	}
	if (!event.filename) {
		return false;
	}
	try {
		return new URL(event.filename, location.href).origin !== location.origin;
	} catch {
		return false;
	}
}

// The language the player picked in the menu, or the browser's
function language(): Language {
	try {
		const options = JSON.parse(localStorage.getItem('gameOptions') ?? '{}') as { language?: string };
		if (options.language && options.language in TEXT) {
			return options.language as Language;
		}
	} catch {
		// Fall back to the browser's language
	}
	for (const lang of navigator.languages ?? [navigator.language]) {
		if (/^zh/i.test(lang)) {
			return 'zh-TW';
		}
		if (/^en/i.test(lang)) {
			return 'en';
		}
	}
	return 'zh-TW';
}

function element(tag: string, className: string, text?: string): HTMLElement {
	const el = document.createElement(tag);
	if (className) {
		el.className = className;
	}
	if (text !== undefined) {
		el.textContent = text;
	}
	return el;
}

function selectText(el: HTMLElement): void {
	const range = document.createRange();
	range.selectNodeContents(el);
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}

// The styles live here rather than in the stylesheets, in case those failed to load
function addStyle(): void {
	if (document.getElementById('crashScreenStyle')) {
		return;
	}
	const style = document.createElement('style');
	style.id = 'crashScreenStyle';
	style.textContent = `
.crashScreen { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center;
	padding: 16px; background: rgba(20, 16, 34, 0.85);
	font-family: "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", "Heiti TC", sans-serif; }
.crashScreen .crashPanel { box-sizing: border-box; width: 100%; max-width: 420px; padding: 20px; border: 3px solid #f29a3a;
	border-radius: 6px; background: #fffaf0; color: #3b2a3f; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
.crashScreen h2 { margin: 0 0 8px; font-size: 20px; color: #8a4b2e; }
.crashScreen p { margin: 0 0 16px; line-height: 1.6; }
.crashScreen button { font: inherit; padding: 8px 18px; border: 2px solid #8a4b2e; border-radius: 4px;
	background: #f29a3a; color: #fff; cursor: pointer; }
.crashScreen button:focus-visible { outline: 3px solid #5a3d6b; outline-offset: 2px; }
.crashScreen .crashDetails { margin-top: 16px; }
.crashScreen summary { cursor: pointer; color: #5a3d6b; }
.crashScreen pre { max-height: 160px; overflow: auto; margin: 8px 0; padding: 8px; border-radius: 4px; background: #f3ead9;
	font-size: 12px; white-space: pre-wrap; word-break: break-word; }
.crashScreen .crashCopy { padding: 4px 12px; font-size: 14px; }
`;
	document.head.append(style);
}

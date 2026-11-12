import { afterEach, describe, expect, it, vi } from 'vitest';
import Content from '../src/app/gamecontent.js';
import en from '../src/app/locale/en.js';
import zhTW from '../src/app/locale/zh-TW.js';
import TextStore from '../src/app/textStore.js';

// Every text, keyed by its path, e.g. JOURNAL.day1
function texts(value: unknown, prefix = '', out = new Map<string, unknown>()) {
	if (value !== null && typeof value === 'object') {
		for (const [key, child] of Object.entries(value)) {
			texts(child, prefix ? prefix + '.' + key : key, out);
		}
	} else {
		out.set(prefix, value);
	}
	return out;
}

const placeholders = (text: unknown) =>
	typeof text === 'string' ? [...text.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort() : [];

const enTexts = texts(en);
const zhTexts = texts(zhTW);

describe('locales', () => {
	it('have the same keys', () => {
		expect([...enTexts.keys()].sort()).toEqual([...zhTexts.keys()].sort());
	});

	it('use the same placeholders', () => {
		for (const [path, text] of enTexts) {
			expect(placeholders(zhTexts.get(path)), path).toEqual(placeholders(text));
		}
	});

	it('cover every key the game asks for', () => {
		const sources = import.meta.glob<string>('../src/app/**/*.js', { query: '?raw', import: 'default', eager: true });
		const keys = new Set<string>();
		for (const source of Object.values(sources)) {
			// Literal keys only; keys built at run time are added below
			for (const match of source.matchAll(/getText\('([A-Z0-9_]+)'(?!\s*\+)/g)) {
				keys.add(match[1]);
			}
			// Save slot buttons pass their text key along
			for (const match of source.matchAll(/\btext: '([A-Z_]+)'/g)) {
				keys.add(match[1]);
			}
		}
		for (const skill of Object.keys(Content.Skills)) {
			keys.add('SKILL_' + skill.toUpperCase());
		}
		expect(keys.size).toBeGreaterThan(20);
		for (const key of keys) {
			expect(en, key).toHaveProperty([key]);
			expect(zhTW, key).toHaveProperty([key]);
		}
	});
});

describe('TextStore', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('fills placeholders', () => {
		expect(new TextStore('en').get('DAY_N', 5)).toBe('Day 5');
	});

	it('falls back to Traditional Chinese', () => {
		expect(new TextStore().localeName).toBe('zh-TW');
		expect(new TextStore('fr').localeName).toBe('zh-TW');
		expect(new TextStore('fr').isReady()).toBe(true);
	});

	it('picks a locale from the browser languages', () => {
		const languages = vi.spyOn(navigator, 'languages', 'get');
		languages.mockReturnValue(['ja-JP', 'en-US']);
		expect(TextStore.detectLocale()).toBe('en');
		languages.mockReturnValue(['zh-CN', 'en']);
		expect(TextStore.detectLocale()).toBe('zh-TW');
		languages.mockReturnValue(['fr-FR']);
		expect(TextStore.detectLocale()).toBe('zh-TW');
	});
});

import { parse } from 'acorn';
import { describe, expect, it, vi } from 'vitest';

const loaders = import.meta.glob('../src/app/**/*.js');
const sources = import.meta.glob<string>('../src/app/**/*.js', { query: '?raw', import: 'default', eager: true });

// main.js starts the game, so it is left out; everything it imports is covered
const entries = Object.keys(loaders).filter((path) => !path.endsWith('/main.js'));

type AstNode = { type: string; [key: string]: unknown };

const FUNCTIONS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

const isNode = (value: unknown): value is AstNode =>
	typeof value === 'object' && value !== null && typeof (value as AstNode).type === 'string';

function children(node: AstNode): AstNode[] {
	const out: AstNode[] = [];
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			out.push(...value.filter(isNode));
		} else if (isNode(value)) {
			out.push(value);
		}
	}
	return out;
}

// Resolves an import against the importing module, both written like '../src/app/x.js'
function resolve(from: string, specifier: string): string {
	const parts = from.split('/').slice(0, -1);
	for (const part of specifier.split('/')) {
		if (part === '..') {
			parts.pop();
		} else if (part !== '.') {
			parts.push(part);
		}
	}
	return parts.join('/');
}

// Lists a module's imports, and the imports it uses while it is being evaluated:
// code outside functions, plus functions called right away (IIFEs, or local
// functions called at the top level). Code in callbacks runs later and is skipped.
function analyse(path: string, source: string) {
	const program = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }) as unknown as AstNode;
	const statements = program.body as AstNode[];
	const imported = new Map<string, string>();
	const imports: string[] = [];
	const localFunctions = new Map<string, AstNode>();
	for (const statement of statements) {
		if (statement.type === 'ImportDeclaration') {
			const target = resolve(path, (statement.source as AstNode).value as string);
			if (!(target in sources)) {
				continue;
			}
			imports.push(target);
			for (const specifier of statement.specifiers as AstNode[]) {
				imported.set((specifier.local as AstNode).name as string, target);
			}
		} else if (statement.type === 'FunctionDeclaration') {
			localFunctions.set((statement.id as AstNode).name as string, statement);
		} else if (statement.type === 'VariableDeclaration') {
			for (const declarator of statement.declarations as AstNode[]) {
				const init = declarator.init as AstNode | null;
				if (init && FUNCTIONS.has(init.type)) {
					localFunctions.set((declarator.id as AstNode).name as string, init);
				}
			}
		}
	}

	const usedWhileLoading = new Set<string>();
	const entered = new Set<AstNode>();
	const visit = (node: AstNode): void => {
		if (FUNCTIONS.has(node.type)) {
			return;
		}
		if (node.type === 'Identifier' && imported.has(node.name as string)) {
			usedWhileLoading.add(imported.get(node.name as string)!);
		}
		if (node.type === 'CallExpression' || node.type === 'NewExpression') {
			let callee = node.callee as AstNode;
			if (callee.type === 'MemberExpression') {
				callee = callee.object as AstNode; // (function() {...}).call(this)
			}
			const called = FUNCTIONS.has(callee.type) ? callee
				: callee.type === 'Identifier' ? localFunctions.get(callee.name as string) : undefined;
			if (called && !entered.has(called)) {
				entered.add(called);
				visit(called.body as AstNode);
			}
		}
		if (node.type === 'MemberExpression' && !node.computed) {
			visit(node.object as AstNode);
		} else if (node.type === 'Property' && !node.computed) {
			visit(node.value as AstNode);
		} else {
			children(node).forEach(visit);
		}
	};
	statements.filter((s) => s.type !== 'ImportDeclaration').forEach(visit);
	return { imports, usedWhileLoading };
}

const modules = new Map(Object.entries(sources).map(([path, source]) => [path, analyse(path, source)]));

function reaches(from: string, to: string): boolean {
	const seen = new Set([from]);
	const pending = [from];
	while (pending.length > 0) {
		for (const next of modules.get(pending.pop()!)!.imports) {
			if (next === to) {
				return true;
			}
			if (!seen.has(next)) {
				seen.add(next);
				pending.push(next);
			}
		}
	}
	return false;
}

const short = (path: string) => path.replace('../src/app/', '');

describe('module graph', () => {
	it('loads the whole game through the engine', async () => {
		const { default: Engine } = await import('../src/app/engine.js');
		expect(Engine.init).toBeTypeOf('function');
	});

	it('registers every module that is looked up late', async () => {
		await import('../src/app/engine.js');
		const { getModule } = await import('../src/app/modules.js');
		for (const name of ['engine', 'world', 'graphics/graphics', 'audio/audio']) {
			expect(getModule(name), name).toBeTypeOf('object');
		}
		expect(() => getModule('missing')).toThrow('has not loaded yet');
	});

	// RequireJS ran a module only after the modules it listed. ES modules follow
	// import order, so in a cycle a module can run before one it needs, e.g. a
	// subclass before its base class. Whichever module is loaded first, that cannot
	// happen as long as nothing a module needs while loading can import it back.
	// (Checked on the source: in tests an unfinished module reads as undefined,
	// where a browser throws, so loading alone would miss some of these.)
	it('never needs a module that imports it back while loading', () => {
		const problems: string[] = [];
		for (const [path, { usedWhileLoading }] of modules) {
			for (const used of usedWhileLoading) {
				if (used !== path && reaches(used, path)) {
					problems.push(short(path) + ' needs ' + short(used) + ', which imports it back');
				}
			}
		}
		expect(problems).toEqual([]);
	});

	it.each(entries)('loads %s on its own', async (path) => {
		vi.resetModules();
		await expect(loaders[path]()).resolves.toBeDefined();
	});
});

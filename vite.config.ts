import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Debug-only elements in index.html carry a nodeploy attribute and stay out of builds
function stripDebugElements(): Plugin {
	return {
		name: 'duskward:strip-nodeploy',
		apply: 'build',
		transformIndexHtml(html) {
			return html.replace(/^[ \t]*<[^>\n]*\bnodeploy\b[^\n]*\n/gm, '');
		},
	};
}

export default defineConfig({
	// Relative URLs, so the build works from any path (GitHub Pages serves it under /Duskward/)
	base: './',
	plugins: [stripDebugElements()],
	server: {
		// Saves live in localStorage, which is per origin: keep the port the old dev server used
		port: 8140,
		strictPort: true,
	},
	preview: {
		port: 8141,
		strictPort: true,
	},
	test: {
		environment: 'jsdom',
		include: ['tests/**/*.test.ts'],
	},
});

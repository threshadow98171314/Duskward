import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
	{
		ignores: ['dist/', 'node_modules/', 'coverage/', 'public/', 'src/vendor/', 'tools/'],
	},
	{
		// The original game code. ES modules always run in strict mode, so these
		// catch what strict mode turns into errors, plus a few plain mistakes.
		// The code gets the full rule set as it is rewritten in TypeScript.
		files: ['src/app/**/*.js'],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			globals: {
				...globals.browser,
				// Read only behind a typeof check, for Safari before 14.1
				webkitAudioContext: 'readonly',
			},
		},
		rules: {
			'no-undef': 'error',
			'no-import-assign': 'error',
			'no-func-assign': 'error',
			'no-global-assign': 'error',
			'no-inner-declarations': 'error',
			'no-dupe-keys': 'error',
			'no-self-assign': 'error',
			'no-unsafe-finally': 'error',
		},
	},
	{
		files: ['**/*.ts'],
		extends: [js.configs.recommended, tseslint.configs.recommended],
	},
);

// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'packages/api-client/src/generated/**',
      'design/**',
    ],
  },

  eslint.configs.recommended,

  // Reguły TypeScript z informacją o typach. `projectService` sam znajduje
  // najbliższy tsconfig.json dla każdego pliku (osobny w każdym pakiecie).
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Środowiska uruchomieniowe.
  {
    files: ['apps/api/**/*.ts', '**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/api-client/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },

  // Musi być ostatni: wyłącza reguły stylistyczne, za które odpowiada Prettier.
  prettier,
);

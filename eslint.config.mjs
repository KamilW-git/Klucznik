// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
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
      'apps/api/src/infrastructure/prisma/generated/**',
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

  // React (apps/web): reguły hooków, dostępność JSX, granice Fast Refresh.
  {
    files: ['apps/web/**/*.tsx'],
    extends: [
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
    ],
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      // `onSubmit={(e) => void handleSubmit(e)}`, `onClick={() => void navigate(...)}`
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    // Pomocniki testów nie są ładowane przez Vite (Fast Refresh ich nie dotyczy).
    files: ['apps/web/src/test/**/*.tsx', 'apps/web/src/**/*.test.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Musi być ostatni: wyłącza reguły stylistyczne, za które odpowiada Prettier.
  prettier,
);

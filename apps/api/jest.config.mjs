// Testy jednostkowe: pliki *.spec.ts obok kodu w src/.
// Uruchamiane z `--experimental-vm-modules`, bo pakiety NestJS 12 są ESM (Q-26).

/** @type {import('jest').Config} */
export default {
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!main.ts', '!openapi/export.ts'],
  coverageDirectory: '../coverage',
};

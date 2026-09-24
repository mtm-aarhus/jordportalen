// Jest koerer uafhaengigt af SPFx' egen Heft-byggekaede. Det er bevidst:
// Heft-integrationen varierer mellem SPFx-versioner, og domaenelaget har
// ingen SPFx-afhaengigheder, saa det kan testes for sig.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/webparts/jordportalen/domaene/**/*.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};

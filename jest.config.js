module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/infra/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};

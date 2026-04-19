const sharedConfig = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/packages/core/src/$1',
    '^@text-editor/(.*)$': '<rootDir>/packages/text-editor/src/$1',
    '^@graphic-editor/(.*)$': '<rootDir>/packages/graphic-editor/src/$1',
    '^@ui/(.*)$': '<rootDir>/packages/ui/src/$1',
    '\\.scss$': '<rootDir>/jest/__mocks__/styleMock.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(nanoid)/)',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': ['ts-jest', { tsconfig: { allowJs: true } }],
  },
};

module.exports = {
  projects: [
    {
      ...sharedConfig,
      displayName: 'core',
      testEnvironment: 'node',
      roots: ['<rootDir>/packages/core'],
    },
    {
      ...sharedConfig,
      displayName: 'text-editor',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/packages/text-editor'],
    },
  ],
};

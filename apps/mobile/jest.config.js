/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@brainlink/types$": "<rootDir>/../../packages/types/src/index.ts",
    "^expo-secure-store$": "<rootDir>/src/__mocks__/expo-secure-store.ts",
    "^expo-sensors$": "<rootDir>/src/__mocks__/expo-sensors.ts",
    "^expo-av$": "<rootDir>/src/__mocks__/expo-av.ts",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|@brainlink)",
  ],
};

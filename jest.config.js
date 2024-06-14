// jest.config.js
module.exports = {
    //... (rest of the config remains the same)
    preset: 'ts-jest',
    roots: ['<rootDir>'],
    collectCoverage: true,
    coverageReporters: ['json', 'lcov', 'clover'],
  };
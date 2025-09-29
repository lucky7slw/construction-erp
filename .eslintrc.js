module.exports = {
  root: true,
  extends: ['@hhhomespm/eslint-config'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'build/',
    '*.config.js',
    '*.config.ts'
  ]
};
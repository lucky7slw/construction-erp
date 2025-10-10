module.exports = {
  extends: ['@hhhomespm/eslint-config/node'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  }
};
module.exports = {
  extends: [
    '@hhhomespm/eslint-config/react',
    'next/core-web-vitals'
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  }
};
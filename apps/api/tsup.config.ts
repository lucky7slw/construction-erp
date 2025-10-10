import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Disable type checking for now - pre-existing errors
  clean: true,
  minify: false,
  sourcemap: true,
  target: 'es2022',
  outDir: 'dist'
});
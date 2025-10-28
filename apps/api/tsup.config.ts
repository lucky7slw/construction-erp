import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'], // Use CommonJS for better compatibility with Prisma
  dts: false, // Disable type checking for now - pre-existing errors
  clean: true,
  minify: false,
  sourcemap: true,
  target: 'es2022',
  outDir: 'dist',
  external: [
    'sharp', // Mark sharp as external (native module)
    '@prisma/client', // Don't bundle Prisma client
    '.prisma/client', // Don't bundle generated Prisma
  ],
  noExternal: []
});
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  dts: true,
  format: ['cjs', 'esm'],
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: ['omg-parser', 'omg-compiler', '@docusaurus/logger', '@docusaurus/types'],
})

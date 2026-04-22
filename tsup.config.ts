import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'theme/OmgStatus/index': 'src/theme/OmgStatus/index.tsx',
    'theme/OmgWeblogLatest/index': 'src/theme/OmgWeblogLatest/index.tsx',
    'theme/OmgPaste/index': 'src/theme/OmgPaste/index.tsx',
  },
  dts: true,
  format: ['cjs', 'esm'],
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: [
    '@docusaurus/ExecutionEnvironment',
    '@docusaurus/useGlobalData',
    '@docusaurus/useDocusaurusContext',
    '@theme/OmgStatus',
    '@theme/OmgWeblogLatest',
    '@theme/OmgPaste',
    'react',
    'react-dom',
  ],
  loader: {
    '.css': 'copy',
  },
})

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@docusaurus/useGlobalData': path.resolve(__dirname, './tests/mocks/useGlobalData.ts'),
      '@docusaurus/useDocusaurusContext': path.resolve(
        __dirname,
        './tests/mocks/useDocusaurusContext.ts'
      ),
      '@docusaurus/ExecutionEnvironment': path.resolve(
        __dirname,
        './tests/mocks/ExecutionEnvironment.ts'
      ),
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})

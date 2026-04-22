import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('@docusaurus/types').Config} */
export default {
  title: 'Plugin omg Example',
  url: 'https://example.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'mcclowes',
  projectName: 'docusaurus-plugin-omg-example',
  onBrokenLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */ ({
        docs: { sidebarPath: path.resolve(__dirname, './sidebars.js') },
        blog: false,
        theme: { customCss: path.resolve(__dirname, './src/css/custom.css') },
      }),
    ],
  ],

  plugins: [
    [
      path.resolve(__dirname, '../../dist'),
      {
        addresses: ['adam'],
        pastes: [],
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Plugin omg',
      items: [{ to: '/docs/intro', label: 'Docs', position: 'left' }],
    },
  },
}

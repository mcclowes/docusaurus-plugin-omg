import type { Config } from '@docusaurus/types'
import type { ThemeConfig } from '@docusaurus/preset-classic'
import { themes as prismThemes } from 'prism-react-renderer'
import type { PluginOmgOptions } from 'docusaurus-plugin-omg'

const omgOptions: PluginOmgOptions = {
  addresses: ['adam'],
  pastes: [],
}

const config: Config = {
  title: 'Plugin omg Demo',
  tagline: 'Showcase of docusaurus-plugin-omg',
  url: 'https://example.com',
  baseUrl: '/',
  organizationName: 'mcclowes',
  projectName: 'docusaurus-plugin-omg-sample',
  trailingSlash: false,
  staticDirectories: [],

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/mcclowes/docusaurus-plugin-omg/tree/main/examples/sample-site',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  plugins: [['docusaurus-plugin-omg', omgOptions]],

  themeConfig: {
    navbar: {
      title: 'Plugin omg Demo',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/mcclowes/docusaurus-plugin-omg',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [{ label: 'Introduction', to: '/docs/intro' }],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub issues',
              href: 'https://github.com/mcclowes/docusaurus-plugin-omg/issues',
            },
          ],
        },
        {
          title: 'omg.lol',
          items: [{ label: 'omg.lol', href: 'https://omg.lol/' }],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} mcclowes`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies ThemeConfig,
}

export default config

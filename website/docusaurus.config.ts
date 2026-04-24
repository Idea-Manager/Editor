import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'IdeaEditor',
  tagline:
    'Block-based writing and graphic editing in one workspace—text and graphic modes with embeddable frames in the same document.',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  // Project Pages: https://idea-manager.github.io/Editor/ — use baseUrl '/Editor/'.
  // After GitHub Pages custom domain + DNS work for idea-editor.com, switch to:
  //   url: 'https://idea-editor.com', baseUrl: '/'
  url: 'https://idea-manager.github.io',
  baseUrl: '/Editor/',
  trailingSlash: true,

  organizationName: 'Idea-Manager',
  projectName: 'Editor',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
          editUrl: 'https://github.com/Idea-Manager/Editor/tree/master/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'IdeaEditor',
      logo: {
        alt: 'IdeaEditor',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/Idea-Manager/Editor',
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
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
            {
              label: 'Contributing',
              to: '/docs/contributing',
            },
            {
              label: 'License',
              to: '/docs/license',
            },
          ],
        },
        {
          title: 'Repository',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Idea-Manager/Editor',
            },
            {
              label: 'Issues',
              href: 'https://github.com/Idea-Manager/Editor/issues',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} IdeaEditor contributors. Licensed under the MIT License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

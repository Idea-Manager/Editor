import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting started',
      items: ['getting-started/intro', 'getting-started/architecture'],
    },
    {
      type: 'category',
      label: 'Text editor',
      items: [
        'text-editor/overview',
        'text-editor/custom-blocks',
        'text-editor/toolbars',
        'text-editor/i18n',
        'text-editor/theming',
        'text-editor/clipboard',
      ],
    },
    {
      type: 'category',
      label: 'Graphic editor',
      items: ['graphic-editor/roadmap'],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/commands',
        'concepts/history-and-undo',
        'concepts/operation-log',
        'concepts/events',
        'concepts/document-model',
        'concepts/text-editor-architecture',
      ],
    },
    {
      type: 'category',
      label: 'Project',
      items: ['project/contributing', 'project/license'],
    },
  ],
};

export default sidebars;

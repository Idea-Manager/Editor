import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  // Block type labels
  'block.paragraph': 'Paragraph',
  'block.heading': 'Heading',
  'block.listOrdered': 'Numbered List',
  'block.listUnordered': 'Unordered List',
  'block.table': 'Table',
  'block.embed': 'Embed',

  // Editor placeholder
  'editor.placeholder': "Type '/' for command",

  // Floating toolbar
  'toolbar.alignLeft': 'Align left',
  'toolbar.alignCenter': 'Align center',
  'toolbar.alignRight': 'Align right',
  'toolbar.textColor': 'Text color',
  'toolbar.addLink': 'Add link',
  'toolbar.linkUrlPlaceholder': 'https://…',
  'toolbar.linkOpenNewTab': 'Open link in new tab',
  'toolbar.linkEdit': 'Edit link',
  'toolbar.linkCopy': 'Copy link',

  // Block gutter
  'gutter.addBlock': 'Add block below',
  'gutter.dragToReorder': 'Drag to reorder',
  'gutter.removeBlock': 'Remove block',
  'gutter.confirmRemoveTitle': 'Remove this block?',
  'gutter.confirmRemoveMessage':
    'This block will be deleted, including all of its content. You can undo this with the editor undo action.',
  'gutter.modalCancel': 'Cancel',
  'gutter.modalConfirm': 'Confirm',

  // Slash palette
  'slash.noResults': 'No results',

  // Table context menu
  'table.insertRowAbove': 'Insert Row Above',
  'table.insertRowBelow': 'Insert Row Below',
  'table.deleteRow': 'Delete Row',
  'table.insertColumnLeft': 'Insert Column Left',
  'table.insertColumnRight': 'Insert Column Right',
  'table.deleteColumn': 'Delete Column',
  'table.mergeCells': 'Merge Cells',
  'table.cellBorders': 'Cell Borders',
  'table.borderTop': 'Top',
  'table.borderRight': 'Right',
  'table.borderBottom': 'Bottom',
  'table.borderLeft': 'Left',
  'table.background': 'Background',
  'table.bgNone': 'None',
  'table.bgGray50': 'Gray 50',
  'table.bgGray100': 'Gray 100',
  'table.bgGray200': 'Gray 200',
  'table.bgGray300': 'Gray 300',

  // Color picker
  'colorPicker.custom': 'Custom color',
  'colorPicker.select': 'Select',
  'colorPicker.cancel': 'Cancel',

  // Table size picker
  'table.insertTable': 'Insert Table',
  'table.createTableTitle': 'Create table',
  'table.borders': 'Borders',
  'table.borderThickness': 'Border thickness (1px; 8px]',
  'table.borderThicknessPx': 'px',
  'table.thicknessPreviewHint': 'Preview: selected border line thickness',
  'table.allBorders': 'All Borders',
  'table.noBorders': 'No Borders',
  'table.outsideOnly': 'Outside Only',
  'table.insideOnly': 'Inside Only',
  'table.cancel': 'Cancel',
  'table.create': 'Create',

  // Embed block
  'embed.placeholder': 'Paste a URL (YouTube, Figma, Miro, Google Maps...)',
  'embed.button': 'Embed',
  'embed.open': 'Open ',
  'embed.remove': 'Remove embed',

  // Top bar
  'topbar.untitled': 'Untitled',
  'topbar.undo': 'Undo',
  'topbar.redo': 'Redo',
  'topbar.import': 'Import',
  'topbar.export': 'Export',
  'topbar.copy': 'Copy',
  'topbar.preview': 'Preview',
  'topbar.importJson': 'Import JSON',
  'topbar.exportJson': 'Export JSON',
  'topbar.copyJson': 'Copy JSON',
  'topbar.previewJson': 'Preview JSON',

  // Status bar
  'status.characterSingular': '{count} character',
  'status.characterPlural': '{count} characters',
  'status.blockSingular': '{count} block',
  'status.blockPlural': '{count} blocks',

  // Command palette
  'palette.placeholder': 'Type a command...',
  'palette.empty': 'No commands found',

  // Import / export
  'io.exportFilename': 'project.json',
  'io.exported': 'Document exported',
  'io.copiedClipboard': 'JSON copied to clipboard',
  'io.copyFailed': 'Failed to copy to clipboard',
  'io.invalidDocument': 'Invalid document: {error}',
  'io.unknownError': 'unknown error',
  'io.importConfirmTitle': 'Import JSON?',
  'io.importConfirmCancel': 'Cancel',
  'io.importConfirmPrimary': 'Replace',
  'io.confirmReplace': 'This will replace the current document. Continue?',
  'io.imported': 'Document imported',
  'io.importFailed': 'Import failed: {error}',
  'io.previewTitle': 'Document JSON',
  'io.copyButton': 'Copy',
  'io.jsonCopied': 'JSON copied',

  // Shortcut labels
  'shortcut.commandPalette': 'Command Palette',
  'shortcut.exportJson': 'Export JSON',
};

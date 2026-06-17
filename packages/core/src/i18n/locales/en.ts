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

  // Mode toggle
  'mode.text': 'Text',
  'mode.graphic': 'Graphic',
  'mode.toggle.aria': 'Editor mode',

  // Shortcut labels
  'shortcut.commandPalette': 'Command Palette',
  'shortcut.exportJson': 'Export JSON',

  // Graphic editor — page & viewport
  'graphic.page.untitled': 'Untitled page',
  'graphic.zoom.label': 'Zoom:',
  'graphic.zoom.in': 'Zoom in',
  'graphic.zoom.out': 'Zoom out',
  'graphic.viewport.percent': '{percent}%',

  // Graphic editor — block labels
  'graphic.block.path': 'Drawing',
  'graphic.block.rectangle': 'Rectangle',
  'graphic.block.triangle': 'Triangle',
  'graphic.block.circle': 'Circle',
  'graphic.block.sticker': 'Sticker',
  'graphic.group.shapes': 'Shapes',

  // Graphic editor — frame
  'graphic.frame.defaultName': 'Frame {n}',
  'graphic.frame.label': '{name}',

  // Graphic editor — tools
  'graphic.tool.selection': 'Selection',
  'graphic.tool.frame': 'Frame',
  'graphic.tool.pen': 'Pen',
  'graphic.tool.sticker': 'Sticker',
  'graphic.tool.hand': 'Hand',
  'graphic.placement.cancel': 'Press ESC to cancel placement',

  // Graphic editor — selection handles
  'graphic.handle.move': 'Move',
  'graphic.handle.resize-nw': 'Resize from top-left',
  'graphic.handle.resize-ne': 'Resize from top-right',
  'graphic.handle.resize-se': 'Resize from bottom-right',
  'graphic.handle.resize-sw': 'Resize from bottom-left',

  // Graphic editor — tools (hints)
  'graphic.tool.pen.hint': 'Drag to draw a freehand stroke',

  // Graphic editor — block properties
  'graphic.props.window.title': '{label}',
  'graphic.props.window.close': 'Close',
  'graphic.props.text': 'Text',
  'graphic.props.htmlTemplate': 'Template',
  'graphic.props.pivots': 'Pivot points',
  'graphic.props.text.placeholder': 'Type something…',
  'graphic.props.border': 'Border',
  'graphic.props.background': 'Background',
  'graphic.props.strokeColor': 'Stroke color',
  'graphic.props.textColor': 'Text color',
  'graphic.props.fontSize': 'Font size',
  'graphic.props.color': 'Color',
  'graphic.props.thickness': 'Thickness',

  // Graphic editor — group properties window
  'graphic.group.title': 'Selection ({count})',
  'graphic.group.lock': 'Lock',
  'graphic.group.group': 'Group',
  'graphic.group.createBlock': 'Create new block',
  'graphic.group.createBlock.input': 'Name',
  'graphic.group.createBlock.success': 'Saved "{name}" to Custom',
  'graphic.group.empty': 'Custom blocks appear here once you create them',
  'graphic.group.custom': 'Custom',
  'graphic.block.tile.add': 'Click to place. ESC to cancel.',

  // Graphic editor — left panel toolbar
  'graphic.leftPanel.sortChapters': 'Sort chapters',
  'graphic.leftPanel.expandAll': 'Expand all chapters',
  'graphic.leftPanel.collapseAll': 'Collapse all chapters',
  'graphic.leftPanel.viewTiles': 'Tile view',
  'graphic.leftPanel.viewList': 'List view',
};

import type { TranslationDictionary } from '../types';

export const uk: TranslationDictionary = {
  // Block type labels
  'block.paragraph': 'Параграф',
  'block.heading': 'Заголовок',
  'block.listOrdered': 'Нумерований список',
  'block.listUnordered': 'Маркований список',
  'block.table': 'Таблиця',
  'block.embed': 'Вбудовування',

  // Editor placeholder
  'editor.placeholder': "Введіть '/' для команди",

  // Floating toolbar
  'toolbar.alignLeft': 'Вирівняти ліворуч',
  'toolbar.alignCenter': 'Вирівняти по центру',
  'toolbar.alignRight': 'Вирівняти праворуч',
  'toolbar.textColor': 'Колір тексту',
  'toolbar.addLink': 'Додати посилання',
  'toolbar.linkUrlPlaceholder': 'https://…',
  'toolbar.linkOpenNewTab': 'Відкрити посилання в новій вкладці',
  'toolbar.linkEdit': 'Редагувати посилання',
  'toolbar.linkCopy': 'Копіювати посилання',

  // Block gutter
  'gutter.addBlock': 'Додати блок нижче',
  'gutter.dragToReorder': 'Перетягніть для зміни порядку',

  // Slash palette
  'slash.noResults': 'Нічого не знайдено',

  // Table context menu
  'table.insertRowAbove': 'Вставити рядок вище',
  'table.insertRowBelow': 'Вставити рядок нижче',
  'table.deleteRow': 'Видалити рядок',
  'table.insertColumnLeft': 'Вставити стовпець ліворуч',
  'table.insertColumnRight': 'Вставити стовпець праворуч',
  'table.deleteColumn': 'Видалити стовпець',
  'table.mergeCells': 'Об\'єднати комірки',
  'table.cellBorders': 'Межі комірки',
  'table.borderTop': 'Верх',
  'table.borderRight': 'Право',
  'table.borderBottom': 'Низ',
  'table.borderLeft': 'Ліво',
  'table.background': 'Фон',
  'table.bgNone': 'Без кольору',
  'table.bgGray50': 'Сірий 50',
  'table.bgGray100': 'Сірий 100',
  'table.bgGray200': 'Сірий 200',
  'table.bgGray300': 'Сірий 300',

  // Color picker
  'colorPicker.custom': 'Власний колір',
  'colorPicker.select': 'Вибрати',
  'colorPicker.cancel': 'Скасувати',

  // Table size picker
  'table.insertTable': 'Вставити таблицю',
  'table.createTableTitle': 'Створити таблицю',
  'table.borders': 'Межі',
  'table.allBorders': 'Усі межі',
  'table.noBorders': 'Без меж',
  'table.outsideOnly': 'Тільки зовнішні',
  'table.insideOnly': 'Тільки внутрішні',
  'table.cancel': 'Скасувати',
  'table.create': 'Створити',

  // Embed block
  'embed.placeholder': 'Вставте URL (YouTube, Figma, Miro, Google Maps...)',
  'embed.button': 'Вбудувати',
  'embed.open': 'Відкрити ',
  'embed.remove': 'Видалити вбудовування',

  // Top bar
  'topbar.untitled': 'Без назви',
  'topbar.undo': 'Скасувати',
  'topbar.redo': 'Повторити',
  'topbar.import': 'Імпорт',
  'topbar.export': 'Експорт',
  'topbar.copy': 'Копіювати',
  'topbar.preview': 'Перегляд',
  'topbar.importJson': 'Імпорт JSON',
  'topbar.exportJson': 'Експорт JSON',
  'topbar.copyJson': 'Копіювати JSON',
  'topbar.previewJson': 'Перегляд JSON',

  // Status bar
  'status.wordSingular': '{count} слово',
  'status.wordPlural': '{count} слів',
  'status.blockSingular': '{count} блок',
  'status.blockPlural': '{count} блоків',

  // Command palette
  'palette.placeholder': 'Введіть команду...',
  'palette.empty': 'Команд не знайдено',

  // Import / export
  'io.exportFilename': 'project.json',
  'io.exported': 'Документ експортовано',
  'io.copiedClipboard': 'JSON скопійовано до буфера обміну',
  'io.copyFailed': 'Не вдалося скопіювати до буфера обміну',
  'io.invalidDocument': 'Некоректний документ: {error}',
  'io.unknownError': 'невідома помилка',
  'io.confirmReplace': 'Це замінить поточний документ. Продовжити?',
  'io.imported': 'Документ імпортовано',
  'io.importFailed': 'Помилка імпорту: {error}',
  'io.previewTitle': 'JSON документа',
  'io.copyButton': 'Копіювати',
  'io.jsonCopied': 'JSON скопійовано',

  // Shortcut labels
  'shortcut.commandPalette': 'Палітра команд',
  'shortcut.exportJson': 'Експорт JSON',
};

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
  'gutter.removeBlock': 'Видалити блок',
  'gutter.confirmRemoveTitle': 'Видалити цей блок?',
  'gutter.confirmRemoveMessage':
    'Блок і все його вміст буде видалено. Можна скасувати дією скасування в редакторі.',
  'gutter.modalCancel': 'Скасувати',
  'gutter.modalConfirm': 'Підтвердити',

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
  'table.borderThickness': 'Товщина меж (1px; 8px]',
  'table.borderThicknessPx': 'px',
  'table.thicknessPreviewHint': 'Перегляд: товщина лінії межі',
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
  'status.characterSingular': '{count} символ',
  'status.characterPlural': '{count} символів',
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
  'io.importConfirmTitle': 'Імпортувати JSON?',
  'io.importConfirmCancel': 'Скасувати',
  'io.importConfirmPrimary': 'Замінити',
  'io.confirmReplace': 'Це замінить поточний документ. Продовжити?',
  'io.imported': 'Документ імпортовано',
  'io.importFailed': 'Помилка імпорту: {error}',
  'io.previewTitle': 'JSON документа',
  'io.copyButton': 'Копіювати',
  'io.jsonCopied': 'JSON скопійовано',

  // Mode toggle
  'mode.text': 'Текст',
  'mode.graphic': 'Графіка',
  'mode.toggle.aria': 'Режим редактора',

  // Shortcut labels
  'shortcut.commandPalette': 'Палітра команд',
  'shortcut.exportJson': 'Експорт JSON',

  // Graphic editor — page & viewport
  'graphic.page.untitled': 'Без назви',
  'graphic.zoom.label': 'Масштаб:',
  'graphic.zoom.in': 'Збільшити',
  'graphic.zoom.out': 'Зменшити',
  'graphic.viewport.percent': '{percent}%',

  // Graphic editor — block labels
  'graphic.block.path': 'Малюнок',
  'graphic.block.rectangle': 'Прямокутник',
  'graphic.block.triangle': 'Трикутник',
  'graphic.block.circle': 'Коло',
  'graphic.block.sticker': 'Стікер',
  'graphic.group.shapes': 'Фігури',

  // Graphic editor — frame
  'graphic.frame.defaultName': 'Рамка {n}',
  'graphic.frame.label': '{name}',

  // Graphic editor — tools
  'graphic.tool.selection': 'Виділення',
  'graphic.tool.frame': 'Рамка',
  'graphic.tool.pen': 'Олівець',
  'graphic.tool.sticker': 'Стікер',
  'graphic.tool.hand': 'Рука',
  'graphic.placement.cancel': 'Натисніть ESC для скасування розміщення',

  // Graphic editor — selection handles
  'graphic.handle.move': 'Перемістити',
  'graphic.handle.resize-nw': 'Змінити розмір з верхнього лівого кута',
  'graphic.handle.resize-ne': 'Змінити розмір з верхнього правого кута',
  'graphic.handle.resize-se': 'Змінити розмір з нижнього правого кута',
  'graphic.handle.resize-sw': 'Змінити розмір з нижнього лівого кута',

  // Graphic editor — tools (hints)
  'graphic.tool.pen.hint': 'Перетягніть для вільного малювання',

  // Graphic editor — block properties
  'graphic.props.window.title': '{label}',
  'graphic.props.window.close': 'Закрити',
  'graphic.props.text': 'Текст',
  'graphic.props.htmlTemplate': 'Шаблон',
  'graphic.props.pivots': 'Точки повороту',
  'graphic.props.text.placeholder': 'Введіть текст…',
  'graphic.props.border': 'Межа',
  'graphic.props.background': 'Фон',
  'graphic.props.strokeColor': 'Колір обводки',
  'graphic.props.textColor': 'Колір тексту',
  'graphic.props.fontSize': 'Розмір шрифту',
  'graphic.props.color': 'Колір',
  'graphic.props.thickness': 'Товщина',

  // Graphic editor — group properties window
  'graphic.group.title': 'Виділення ({count})',
  'graphic.group.lock': 'Заблокувати',
  'graphic.group.group': 'Згрупувати',
  'graphic.group.createBlock': 'Створити новий блок',
  'graphic.group.createBlock.input': 'Назва',
  'graphic.group.createBlock.success': '"{name}" збережено у Custom',
  'graphic.group.empty': 'Власні блоки з\'являться тут після створення',
  'graphic.group.custom': 'Власні',
  'graphic.block.tile.add': 'Натисніть для розміщення. ESC — скасувати.',

  // Graphic editor — left panel toolbar
  'graphic.leftPanel.sortChapters': 'Сортувати розділи',
  'graphic.leftPanel.expandAll': 'Розгорнути всі розділи',
  'graphic.leftPanel.collapseAll': 'Згорнути всі розділи',
  'graphic.leftPanel.viewTiles': 'Плитковий вигляд',
  'graphic.leftPanel.viewList': 'Список',
};

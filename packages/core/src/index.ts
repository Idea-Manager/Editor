// ID generation
export { generateId } from './id';
export type { IdPrefix } from './id';

// Model interfaces
export type {
  Node,
  NodeMeta,
  DocumentNode,
  GraphicPageNode,
  BlockNode,
  BlockType,
  TextRun,
  InlineMark,
  ParagraphData,
  HeadingData,
  ListType,
  ListItemData,
  EmbedData,
  GraphicBlockData,
  TableData,
  TableRow,
  TableCell,
  CellBorderStyle,
  BlockSelection,
  AssetMap,
  GraphicElement,
  FrameElement,
  Point,
  Size,
  Rect,
} from './model/interfaces';

// Factory functions
export {
  createDocument,
  createParagraph,
  createHeading,
  createTextRun,
  createGraphicPage,
  createFrame,
} from './model/factory';

// Operation log
export type {
  OperationType,
  OperationRecord,
  OperationPayload,
  NodeInsertPayload,
  NodeDeletePayload,
  NodeUpdatePayload,
  NodeMovePayload,
  TextInsertPayload,
  TextDeletePayload,
} from './operation-log/interfaces';

// Events
export { EventBus } from './events/event-bus';
export type { EditorEvent } from './events/event-bus';

// Commands
export type { Command } from './commands/command';
export { CompositeCommand } from './commands/composite-command';
export { batchCommands } from './commands/helpers';

// History
export { UndoRedoManager } from './history/undo-redo-manager';

// Serialization
export { DocumentSerializer } from './serialization/serializer';
export { DocumentDeserializer } from './serialization/deserializer';
export { validateDocument } from './serialization/validator';
export type { ValidationResult } from './serialization/validator';
export { migrateDocument, LATEST_SCHEMA_VERSION } from './serialization/migrations';

// Shortcuts
export { ShortcutManager } from './shortcuts/shortcut-manager';
export type { ShortcutEntry, ShortcutScope } from './shortcuts/shortcut-manager';

// Platform
export { detectOS, isMac } from './platform/os-detection';
export type { OS } from './platform/os-detection';
export { formatHotkey, hotkeyLabel } from './platform/hotkey';

// i18n
export { I18nService } from './i18n/i18n';
export type { Locale, TranslationDictionary } from './i18n/types';

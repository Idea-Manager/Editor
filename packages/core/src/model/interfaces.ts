// ─── Base Node ───────────────────────────────────────────────────────────────

export interface NodeMeta {
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;   // [CRDT] actorId for attribution
  locked?: boolean;
  version?: number;     // [CRDT] monotonic per-node version counter
}

export interface Node {
  id: string;           // nanoid(), never changes, globally unique [CRDT]
  type: string;
  children?: Node[];
  data: Record<string, unknown>;
  meta?: NodeMeta;
}

// ─── Text Primitives ─────────────────────────────────────────────────────────

export type InlineMark = 'bold' | 'italic' | 'underline' | 'code';

export interface TextRun {
  id: string;           // [CRDT] stable ID for individual runs
  type: 'text';
  data: {
    text: string;
    marks: InlineMark[];
    /** CSS color string (e.g. hex, rgba); omit for inherited color. */
    color?: string;
    /** Link URL for this run; omit when not a link. */
    href?: string;
  };
}

// ─── Block Nodes ─────────────────────────────────────────────────────────────

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'list_item'
  | 'table'
  | 'embed'
  | 'graphic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BlockNode<TData = any> {
  id: string;
  type: BlockType;
  children: TextRun[];
  data: TData;
  meta?: NodeMeta;
}

export interface ParagraphData {
  align: 'left' | 'center' | 'right' | 'justify';
}

export interface HeadingData {
  level: 1 | 2 | 3 | 4 | 5;
  align: 'left' | 'center' | 'right';
}

export type ListType = 'ordered' | 'unordered';

export interface ListItemData {
  listType: ListType;
  depth: number;
}

export interface EmbedData {
  url: string;
  title: string;
  provider?: string;
}

export interface GraphicBlockData {
  graphicPageId: string;
  frameId: string;
  height: number;
}

// ─── Table ───────────────────────────────────────────────────────────────────

export interface CellBorderStyle {
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  background?: string;
}

export interface TableCell {
  id: string;
  /** Nested blocks inside the cell (e.g. paragraph). Non-empty for normal cells; absorbed cells may use []. */
  blocks: BlockNode[];
  colspan: number;
  rowspan: number;
  absorbed: boolean;
  style: CellBorderStyle;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
}

export interface TableData {
  rows: TableRow[];
  columnWidths: number[];
  /** Border line thickness in px (1–8). Omitted = 1. */
  borderWidth?: number;
}

// ─── Selection ───────────────────────────────────────────────────────────────

export interface BlockSelection {
  anchorBlockId: string;
  anchorOffset: number;
  focusBlockId: string;
  focusOffset: number;
  isCollapsed: boolean;
}

// ─── Asset Map ───────────────────────────────────────────────────────────────

export type AssetMap = Record<string, {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}>;

// ─── Graphic Elements ────────────────────────────────────────────────────────

export interface GraphicElement<TData = Record<string, unknown>> {
  id: string;
  type: string;
  frameId?: string;
  data: TData;
  meta?: NodeMeta;
}

export interface FrameElement {
  id: string;
  name: string;
  data: {
    x: number;
    y: number;
    width: number;
    height: number;
    background: string;
    clipContent: boolean;
    showLabel: boolean;
    labelFontSize: number;
  };
  childElementIds: string[];
  meta?: NodeMeta;
}

// ─── Graphic Page ────────────────────────────────────────────────────────────

export interface GraphicPageNode {
  id: string;
  name: string;
  elements: GraphicElement[];
  frames: FrameElement[];
  viewport: { x: number; y: number; zoom: number };
}

// ─── Document Root ───────────────────────────────────────────────────────────

export interface DocumentNode {
  id: string;
  type: 'document';
  schemaVersion: number;
  data: Record<string, unknown>;
  children: BlockNode[];
  graphicPages: GraphicPageNode[];
  assets: AssetMap;
  meta?: NodeMeta;
}

// ─── Geometry Helpers ────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

import { generateId } from '../id';
import {
  DocumentNode,
  BlockNode,
  TextRun,
  GraphicPageNode,
  FrameElement,
  ParagraphData,
  HeadingData,
  InlineMark,
  Rect,
} from './interfaces';

export function createTextRun(text: string, marks: InlineMark[] = []): TextRun {
  return {
    id: generateId('txt'),
    type: 'text',
    data: { text, marks },
  };
}

export function createParagraph(
  text = '',
  align: ParagraphData['align'] = 'left',
): BlockNode<ParagraphData> {
  const children = text ? [createTextRun(text)] : [];
  return {
    id: generateId('blk'),
    type: 'paragraph',
    data: { align },
    children,
    meta: { createdAt: Date.now(), version: 1 },
  };
}

export function createHeading(
  level: HeadingData['level'],
  text = '',
  align: HeadingData['align'] = 'left',
): BlockNode<HeadingData> {
  const children = text ? [createTextRun(text)] : [];
  return {
    id: generateId('blk'),
    type: 'heading',
    data: { level, align },
    children,
    meta: { createdAt: Date.now(), version: 1 },
  };
}

export function createGraphicPage(name: string): GraphicPageNode {
  return {
    id: generateId('page'),
    name,
    elements: [],
    frames: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function createFrame(name: string, bounds: Rect): FrameElement {
  return {
    id: generateId('frm'),
    name,
    data: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      background: '#fafafa',
      clipContent: true,
      showLabel: true,
      labelFontSize: 12,
    },
    childElementIds: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

export function createDocument(): DocumentNode {
  return {
    id: generateId('doc'),
    type: 'document',
    schemaVersion: 1,
    data: {},
    children: [createParagraph()],
    graphicPages: [],
    assets: {},
    meta: { createdAt: Date.now(), version: 1 },
  };
}

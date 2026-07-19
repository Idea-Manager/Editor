import { DocumentNode, BlockNode, TextRun, GraphicPageNode, FrameElement, ParagraphData, HeadingData, InlineMark, Rect } from './interfaces';
export declare function createTextRun(text: string, marks?: InlineMark[]): TextRun;
export declare function createParagraph(text?: string, align?: ParagraphData['align']): BlockNode<ParagraphData>;
export declare function createHeading(level: HeadingData['level'], text?: string, align?: HeadingData['align']): BlockNode<HeadingData>;
export declare function createGraphicPage(name: string): GraphicPageNode;
export declare function createFrame(name: string, bounds: Rect): FrameElement;
export declare function createDocument(): DocumentNode;
//# sourceMappingURL=factory.d.ts.map
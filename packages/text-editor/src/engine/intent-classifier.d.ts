import type { InlineMark } from '@core/model/interfaces';
export type EditIntent = {
    type: 'insertText';
    text: string;
} | {
    type: 'deleteBackward';
} | {
    type: 'deleteForward';
} | {
    type: 'splitBlock';
} | {
    type: 'mergeBackward';
} | {
    type: 'toggleMark';
    mark: InlineMark;
} | {
    type: 'selectAll';
} | {
    type: 'paste';
    data: DataTransfer;
} | {
    type: 'cut';
} | {
    type: 'copy';
} | {
    type: 'undo';
} | {
    type: 'redo';
} | {
    type: 'indent';
} | {
    type: 'outdent';
};
export declare class IntentClassifier {
    classifyKeydown(e: KeyboardEvent): EditIntent | null;
    classifyBeforeInput(e: InputEvent): EditIntent | null;
}
//# sourceMappingURL=intent-classifier.d.ts.map
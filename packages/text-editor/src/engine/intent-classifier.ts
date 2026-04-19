import type { InlineMark } from '@core/model/interfaces';

export type EditIntent =
  | { type: 'insertText'; text: string }
  | { type: 'deleteBackward' }
  | { type: 'deleteForward' }
  | { type: 'splitBlock' }
  | { type: 'mergeBackward' }
  | { type: 'toggleMark'; mark: InlineMark }
  | { type: 'selectAll' }
  | { type: 'paste'; data: DataTransfer }
  | { type: 'cut' }
  | { type: 'copy' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'indent' }
  | { type: 'outdent' };

const MARK_SHORTCUTS: Record<string, InlineMark> = {
  b: 'bold',
  i: 'italic',
  u: 'underline',
};

export class IntentClassifier {
  classifyKeydown(e: KeyboardEvent): EditIntent | null {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && !e.shiftKey) {
      const mark = MARK_SHORTCUTS[e.key.toLowerCase()];
      if (mark) return { type: 'toggleMark', mark };
      if (e.key.toLowerCase() === 'z') return { type: 'undo' };
      if (e.key.toLowerCase() === 'a') return { type: 'selectAll' };
    }

    if (mod && e.shiftKey && e.key.toLowerCase() === 'z') {
      return { type: 'redo' };
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      return { type: 'splitBlock' };
    }

    if (e.key === 'Backspace') {
      return { type: 'deleteBackward' };
    }

    if (e.key === 'Delete') {
      return { type: 'deleteForward' };
    }

    if (e.key === 'Tab' && !mod) {
      return e.shiftKey ? { type: 'outdent' } : { type: 'indent' };
    }

    return null;
  }

  classifyBeforeInput(e: InputEvent): EditIntent | null {
    switch (e.inputType) {
      case 'insertText':
      case 'insertCompositionText':
        return e.data ? { type: 'insertText', text: e.data } : null;

      case 'insertParagraph':
      case 'insertLineBreak':
        return { type: 'splitBlock' };

      case 'deleteContentBackward':
        return { type: 'deleteBackward' };

      case 'deleteContentForward':
        return { type: 'deleteForward' };

      case 'insertFromPaste':
        return null; // Handled by paste event

      default:
        return null;
    }
  }
}

export type ShortcutScope = 'global' | 'text' | 'graphic';

export interface ShortcutEntry {
  keys: string;
  scope: ShortcutScope;
  label: string;
  command: () => void;
}

interface ParsedShortcut {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

function parseKeys(keys: string): ParsedShortcut {
  const parts = keys.toLowerCase().split('+').map(s => s.trim());
  return {
    ctrl: parts.includes('ctrl') || parts.includes('cmd') || parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    key: parts.filter(p => !['ctrl', 'cmd', 'mod', 'shift', 'alt', 'option'].includes(p))[0] ?? '',
  };
}

function matchesEvent(parsed: ParsedShortcut, e: KeyboardEvent): boolean {
  const modMatch = (e.ctrlKey || e.metaKey) === parsed.ctrl;
  const shiftMatch = e.shiftKey === parsed.shift;
  const altMatch = e.altKey === parsed.alt;
  const keyMatch = e.key.toLowerCase() === parsed.key;
  return modMatch && shiftMatch && altMatch && keyMatch;
}

export class ShortcutManager {
  private shortcuts: (ShortcutEntry & { parsed: ParsedShortcut })[] = [];
  private activeScope: ShortcutScope = 'global';
  private handler: ((e: KeyboardEvent) => void) | null = null;

  register(entry: ShortcutEntry): void {
    this.shortcuts.push({ ...entry, parsed: parseKeys(entry.keys) });
  }

  registerAll(entries: ShortcutEntry[]): void {
    for (const entry of entries) {
      this.register(entry);
    }
  }

  setScope(scope: ShortcutScope): void {
    this.activeScope = scope;
  }

  getAll(): ShortcutEntry[] {
    return this.shortcuts.map(({ parsed, ...rest }) => rest);
  }

  search(query: string): ShortcutEntry[] {
    const q = query.toLowerCase();
    return this.shortcuts
      .filter(s => s.label.toLowerCase().includes(q) || s.keys.toLowerCase().includes(q))
      .map(({ parsed, ...rest }) => rest);
  }

  attach(root: HTMLElement | Document = document): () => void {
    this.handler = (e: KeyboardEvent) => {
      for (const shortcut of this.shortcuts) {
        if (shortcut.scope !== 'global' && shortcut.scope !== this.activeScope) continue;
        if (matchesEvent(shortcut.parsed, e)) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.command();
          return;
        }
      }
    };

    root.addEventListener('keydown', this.handler as EventListener, true);
    return () => {
      if (this.handler) {
        root.removeEventListener('keydown', this.handler as EventListener, true);
        this.handler = null;
      }
    };
  }

  destroy(): void {
    this.shortcuts.length = 0;
  }
}

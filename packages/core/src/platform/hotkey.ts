import { isMac } from './os-detection';

const MOD_KEYS = new Set(['mod', 'ctrl', 'cmd']);
const SHIFT_KEYS = new Set(['shift']);
const ALT_KEYS = new Set(['alt', 'option']);

export function formatHotkey(keys: string): string {
  const mac = isMac();
  return keys
    .split('+')
    .map(k => {
      const lk = k.trim().toLowerCase();
      if (MOD_KEYS.has(lk)) return mac ? '\u2318' : 'Ctrl';
      if (SHIFT_KEYS.has(lk)) return mac ? '\u21E7' : 'Shift';
      if (ALT_KEYS.has(lk)) return mac ? '\u2325' : 'Alt';
      return k.trim().toUpperCase();
    })
    .join(mac ? '' : '+');
}

export function hotkeyLabel(action: string, keys: string): string {
  return `${action} (${formatHotkey(keys)})`;
}

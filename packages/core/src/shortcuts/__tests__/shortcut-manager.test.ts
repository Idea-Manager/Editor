/** @jest-environment jsdom */

import { ShortcutManager, isKeyboardEventFromEditableTarget } from '../shortcut-manager';

describe('isKeyboardEventFromEditableTarget', () => {
  it('returns true for non-disabled non-readOnly input', () => {
    const input = document.createElement('input');
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    expect(isKeyboardEventFromEditableTarget(ev)).toBe(true);
  });

  it('returns false for readOnly input', () => {
    const input = document.createElement('input');
    input.readOnly = true;
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    expect(isKeyboardEventFromEditableTarget(ev)).toBe(false);
  });

  it('returns true for contenteditable element as target', () => {
    const host = document.createElement('div');
    host.setAttribute('contenteditable', 'true');
    document.body.appendChild(host);
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(ev, 'target', { value: host, enumerable: true });
    expect(isKeyboardEventFromEditableTarget(ev)).toBe(true);
    host.remove();
  });

  it('returns true when target is text node inside contenteditable', () => {
    const host = document.createElement('div');
    host.setAttribute('contenteditable', 'true');
    const text = document.createTextNode('x');
    host.appendChild(text);
    document.body.appendChild(host);
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(ev, 'target', { value: text, enumerable: true });
    expect(isKeyboardEventFromEditableTarget(ev)).toBe(true);
    host.remove();
  });
});

describe('ShortcutManager', () => {
  it('does not preventDefault or run command when when() returns false', () => {
    const mgr = new ShortcutManager();
    const cmd = jest.fn();
    mgr.setScope('graphic');
    mgr.register({
      keys: 'a',
      scope: 'graphic',
      label: 'test',
      when: () => false,
      command: cmd,
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const detach = mgr.attach(root);
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    root.dispatchEvent(ev);
    expect(cmd).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
    detach();
    root.remove();
  });

  it('preventDefault and runs command when when() returns true', () => {
    const mgr = new ShortcutManager();
    const cmd = jest.fn();
    mgr.setScope('graphic');
    mgr.register({
      keys: 'a',
      scope: 'graphic',
      label: 'test',
      when: () => true,
      command: cmd,
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const detach = mgr.attach(root);
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    root.dispatchEvent(ev);
    expect(cmd).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
    detach();
    root.remove();
  });

  it('preventDefault when when is omitted', () => {
    const mgr = new ShortcutManager();
    const cmd = jest.fn();
    mgr.setScope('graphic');
    mgr.register({
      keys: 'a',
      scope: 'graphic',
      label: 'test',
      command: cmd,
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const detach = mgr.attach(root);
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    root.dispatchEvent(ev);
    expect(cmd).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
    detach();
    root.remove();
  });

  it('skips handling when when uses editable check and event target is input', () => {
    const mgr = new ShortcutManager();
    const cmd = jest.fn();
    mgr.setScope('graphic');
    mgr.register({
      keys: 'a',
      scope: 'graphic',
      label: 'Tool shortcut',
      when: (e) => !isKeyboardEventFromEditableTarget(e),
      command: cmd,
    });
    const root = document.createElement('div');
    const input = document.createElement('input');
    root.appendChild(input);
    document.body.appendChild(root);
    const detach = mgr.attach(root);
    input.focus();
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(cmd).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
    detach();
    root.remove();
  });
});

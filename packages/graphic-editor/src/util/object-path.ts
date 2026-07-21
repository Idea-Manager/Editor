const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function validatePath(path: string): string[] {
  if (!path) throw new Error('object-path: path must be a non-empty string');
  const segments = path.split('.');
  for (const seg of segments) {
    if (FORBIDDEN_SEGMENTS.has(seg)) {
      throw new Error(`object-path: forbidden path segment "${seg}"`);
    }
  }
  return segments;
}

export function getAtPath(obj: unknown, path: string): unknown {
  const segments = validatePath(path);
  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

export function setAtPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const segments = validatePath(path);

  function cloneAndSet(node: unknown, depth: number): unknown {
    const seg = segments[depth];
    const isLast = depth === segments.length - 1;
    const base: Record<string, unknown> =
      node != null && typeof node === 'object' ? { ...(node as Record<string, unknown>) } : {};

    if (isLast) {
      base[seg] = value;
    } else {
      base[seg] = cloneAndSet(base[seg], depth + 1);
    }
    return base;
  }

  return cloneAndSet(obj, 0) as T;
}

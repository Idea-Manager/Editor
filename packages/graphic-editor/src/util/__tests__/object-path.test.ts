import { getAtPath, setAtPath } from '../object-path';

describe('getAtPath', () => {
  it('retrieves a top-level value', () => {
    expect(getAtPath({ a: 1 }, 'a')).toBe(1);
  });

  it('retrieves a nested value', () => {
    expect(getAtPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined when an intermediate key is missing', () => {
    expect(getAtPath({ a: {} }, 'a.b.c')).toBeUndefined();
  });

  it('returns undefined when root is null', () => {
    expect(getAtPath(null, 'a')).toBeUndefined();
  });

  it('throws on empty path', () => {
    expect(() => getAtPath({}, '')).toThrow();
  });

  it('throws on __proto__ segment', () => {
    expect(() => getAtPath({}, '__proto__')).toThrow();
  });

  it('throws on constructor segment', () => {
    expect(() => getAtPath({}, 'constructor')).toThrow();
  });

  it('throws on prototype segment', () => {
    expect(() => getAtPath({}, 'a.prototype.b')).toThrow();
  });
});

describe('setAtPath', () => {
  it('sets a top-level value', () => {
    const result = setAtPath({ a: 1 } as Record<string, unknown>, 'a', 99);
    expect(result.a).toBe(99);
  });

  it('sets a nested value', () => {
    const obj = { data: { x: 10, y: 20 } };
    const result = setAtPath(obj as Record<string, unknown>, 'data.x', 50);
    expect((result as typeof obj).data.x).toBe(50);
  });

  it('returns a new root object (immutability)', () => {
    const obj = { data: { x: 1 } };
    const result = setAtPath(obj as Record<string, unknown>, 'data.x', 2);
    expect(result).not.toBe(obj);
  });

  it('clones every level along the path', () => {
    const inner = { x: 1 };
    const obj = { data: inner };
    const result = setAtPath(obj as Record<string, unknown>, 'data.x', 2) as typeof obj;
    expect(result.data).not.toBe(inner);
  });

  it('does not mutate the original object', () => {
    const obj = { data: { x: 10 } };
    setAtPath(obj as Record<string, unknown>, 'data.x', 99);
    expect(obj.data.x).toBe(10);
  });

  it('creates missing intermediate objects', () => {
    const result = setAtPath({} as Record<string, unknown>, 'a.b.c', 7) as Record<string, unknown>;
    expect((result.a as Record<string, unknown>).b).toBeDefined();
  });

  it('throws on empty path', () => {
    expect(() => setAtPath({} as Record<string, unknown>, '', 1)).toThrow();
  });

  it('throws on __proto__ segment (prototype pollution guard)', () => {
    expect(() => setAtPath({} as Record<string, unknown>, '__proto__.evil', true)).toThrow();
  });

  it('throws on constructor segment', () => {
    expect(() => setAtPath({} as Record<string, unknown>, 'constructor.evil', true)).toThrow();
  });
});

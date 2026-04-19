declare module '*.scss' {
  const content: string;
  export default content;
}

declare module '*.scss?inline' {
  const content: string;
  export default content;
}

declare module '*.html?raw' {
  const content: string;
  export default content;
}

declare module '*.catalog.json' {
  const value: Record<string, unknown>;
  export default value;
}

// Type shims for packages whose subpath entries ship no declarations.

declare module 'mammoth/mammoth.browser' {
  export function extractRawText(options: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: unknown[] }>;
  const mammoth: {
    extractRawText: typeof extractRawText;
  };
  export default mammoth;
}

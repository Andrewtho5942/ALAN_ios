export {};

declare global {
  function jsi_hello(): string;
  function jsi_add(a: number, b: number): number;
  function jsi_bufLen(buf: ArrayBuffer): number;
}

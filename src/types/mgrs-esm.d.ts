declare module "mgrs/dist/mgrs.esm.js" {
  export function forward(lnglat: [number, number], precision?: number): string;
  export function toPoint(mgrs: string): [number, number];
  export function inverse(mgrs: string): [number, number, number, number];
}

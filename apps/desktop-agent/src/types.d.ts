declare module 'qr-image' {
  import { Readable } from 'stream';

  interface Options {
    ec_level?: 'L' | 'M' | 'Q' | 'H';
    type?: 'png' | 'svg' | 'pdf' | 'eps';
    size?: number;
    margin?: number;
    customize?: (node: any) => void;
  }

  export function image(text: string, options?: Options): Readable;
  export function imageSync(text: string, options?: Options): Buffer;
  export function svgObject(text: string, options?: Options): any;
}

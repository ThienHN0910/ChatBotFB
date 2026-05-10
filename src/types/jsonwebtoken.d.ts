declare module 'jsonwebtoken' {
  export function sign(payload: any, secretOrPrivateKey: string, options?: any): string;
  export function verify(token: string, secretOrPublicKey: string, options?: any): any;
  export function decode(token: string, options?: any): any;
  const _default: any;
  export default _default;
}

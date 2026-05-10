// Ambient declaration for @google/generative-ai when SDK is not installed
declare module '@google/generative-ai' {
  const _default: any;
  export default _default;
  export const TextServiceClient: any;
  export const TextGenerationClient: any;
  export const GenerativeServiceClient: any;
}

declare module "zod" {
  const z: any;
  namespace z {
    type infer<T> = any;
  }
  export { z };
}

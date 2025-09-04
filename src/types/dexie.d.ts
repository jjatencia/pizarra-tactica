declare module 'dexie' {
  export default class Dexie {
    constructor(name: string);
    version(n: number): any;
  }
  export interface Table<T, Key> {
    add(...args: any[]): Promise<any>;
    update(...args: any[]): Promise<any>;
    delete(...args: any[]): Promise<any>;
    where(...args: any[]): any;
    toArray(...args: any[]): Promise<T[]>;
    toCollection(...args: any[]): any;
    count(...args: any[]): Promise<number>;
  }
}

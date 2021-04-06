export type UnPromisify<T> = T extends Promise<infer U> ? U : T;
export type Defined<T, Constraint> = T extends Constraint ? T : never;

//workaround to treat mutation and action payloads as optional when they are undefined
//https://github.com/Microsoft/TypeScript/issues/12400#issuecomment-428599865
export type OptionalSpread<T = undefined> =
    T extends undefined
    ? []
    : [T];

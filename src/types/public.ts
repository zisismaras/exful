import {Request, Response} from "express";

//utility
type UnPromisify<T> = T extends Promise<infer U> ? U : T;
type Optional<T, Constraint> = T extends Constraint ? T : never;

//constraints
export type ActionConstraint = {[key: string]: (payload: any) => unknown};
export type MutationConstraint = {[key: string]: (payload: any) => void};
export type StateConstraint = Record<string, unknown>;
export type GetterConstraint = {[key: string]: () => any};
export type SchemaConstraint = Partial<{
    state: StateConstraint,
    getters: GetterConstraint,
    mutations: MutationConstraint,
    actions: ActionConstraint
}>;

type Dispatch<Actions extends ActionConstraint> = {
    <key extends keyof Actions & string>(
        action: key,
        payload: Parameters<Actions[key]>[0]
    ): ReturnType<Actions[key]> extends Promise<any> ? ReturnType<Actions[key]> : Promise<ReturnType<Actions[key]>>
};

type Commit<Mutations extends MutationConstraint> = {
    <key extends keyof Mutations & string>(
        action: key,
        payload: Parameters<Mutations[key]>[0]
    ): ReturnType<Mutations[key]>
};

type GettersAsProperties<Getters extends GetterConstraint> = {
    [key in keyof Getters]: ReturnType<Getters[key]>
};

export type ActionContext<State, Getters, Mutations, Actions> = {
    state: Optional<State, StateConstraint>,
    getters: Getters extends GetterConstraint ? GettersAsProperties<Getters> : never,
    commit: Mutations extends MutationConstraint ? Commit<Mutations> : never,
    dispatch: Actions extends ActionConstraint ? Dispatch<Actions> : never,
    loadModule<M extends keyof Vue["$store"]>(mod: M) : Promise<Vue["$store"][M]>,
    req: Request,
    res: Response,
    isSSR: boolean
}

//creators
export type StateCreator<Schema extends SchemaConstraint> = {
    (stateFn: () => Optional<Schema["state"], StateConstraint>): void
}

export type GetterCreator<Schema extends SchemaConstraint> = {
    (
        getters: Schema["getters"] extends GetterConstraint ? {
            [key in keyof Schema["getters"]]: (
                state: Optional<Schema["state"], StateConstraint>,
                getters: GettersAsProperties<Schema["getters"]>
            ) => ReturnType<Optional<Schema["getters"], GetterConstraint>[key]>
        } : never
    ): void
}

export type MutationCreator<Schema extends SchemaConstraint> = {
    (
        mutations: Schema["mutations"] extends MutationConstraint ? {
            [key in keyof Schema["mutations"]]: (
                state: Optional<Schema["state"], StateConstraint>,
                payload: Parameters<Optional<Schema["mutations"], MutationConstraint>[key]>[0]
            ) => ReturnType<Optional<Schema["mutations"], MutationConstraint>[key]>
        } : never
    ): void
}

export type ActionCreator<Schema extends SchemaConstraint> = {
    (
        actions: Schema["actions"] extends ActionConstraint ? {
            [key in keyof Schema["actions"]]: (
                context: ActionContext<
                    Optional<Schema["state"], StateConstraint>,
                    Optional<Schema["getters"], GetterConstraint>,
                    Optional<Schema["mutations"], MutationConstraint>,
                    Optional<Schema["actions"], ActionConstraint>
                >,
                payload: Parameters<Optional<Schema["actions"], ActionConstraint>[key]>[0]
            ) => ReturnType<Optional<Schema["actions"], ActionConstraint>[key]>
        } : never
    ): void
}

type HookContextMetaData = {
    moduleName: string,
    actionName: string,
    hookName: string
};
export type HooksCreator<Schema extends SchemaConstraint> = {
    (
        hooks: Schema["actions"] extends ActionConstraint ? Partial<{
            [key in keyof Schema["actions"] & string as `before:${key}` | "before:all"]: (
                hookContext: {
                    req: Request,
                    res: Response,
                    isSSR: boolean,
                    metadata: HookContextMetaData,
                    loadModule<M extends keyof Vue["$store"]>(mod: M) : Promise<Vue["$store"][M]>
                }
            ) => void
        } & {
            [key in keyof Schema["actions"] & string as `after:${key}`]: (
                hookContext: {
                    req: Request,
                    res: Response,
                    isSSR: boolean,
                    metadata: HookContextMetaData,
                    loadModule<M extends keyof Vue["$store"]>(mod: M) : Promise<Vue["$store"][M]>,
                    actionResult: UnPromisify<ReturnType<Schema["actions"][key]>>,
                    mutations: {
                        moduleName: string;
                        mutation: string;
                        payload: unknown;
                    }[]
                }
            ) => void
        } & {
            //same as after:{key} but with an `unknown` actionResult
            [key in keyof Schema["actions"] & string as "after:all"]: (
                hookContext: {
                    req: Request,
                    res: Response,
                    isSSR: boolean,
                    metadata: HookContextMetaData,
                    loadModule<M extends keyof Vue["$store"]>(mod: M) : Promise<Vue["$store"][M]>,
                    actionResult: unknown,
                    mutations: {
                        moduleName: string;
                        mutation: string;
                        payload: unknown;
                    }[]
                }
            ) => void
        } & {
            [key in keyof Schema["actions"] & string as `error:${key}` | "error:all"]: (
                hookContext: {
                    req: Request,
                    res: Response,
                    isSSR: boolean,
                    metadata: HookContextMetaData,
                    loadModule<M extends keyof Vue["$store"]>(mod: M) : Promise<Vue["$store"][M]>,
                    error: Error
                }
            ) => void
        }> : never
    ): void
}

export type Accessor<Schema extends SchemaConstraint> = {
    state: Optional<Schema["state"], StateConstraint>,
    getters: Schema["getters"] extends GetterConstraint ?
        GettersAsProperties<Schema["getters"]> : never,
    dispatch: Schema["actions"] extends ActionConstraint ?
        Dispatch<Schema["actions"]> : never
}

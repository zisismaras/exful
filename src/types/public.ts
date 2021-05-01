import {Request, Response} from "express";
import {Context} from "@nuxt/types";
import {Defined, UnPromisify, OptionalSpread} from "./utility";

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
        ...payload: OptionalSpread<Parameters<Actions[key]>[0]>
    ): ReturnType<Actions[key]> extends Promise<any> ? ReturnType<Actions[key]> : Promise<ReturnType<Actions[key]>>
};

type Commit<Mutations extends MutationConstraint> = {
    <key extends keyof Mutations & string>(
        mutation: key,
        ...payload: OptionalSpread<Parameters<Mutations[key]>[0]>
    ): ReturnType<Mutations[key]>
};

type GettersAsProperties<Getters extends GetterConstraint> = {
    [key in keyof Getters]: ReturnType<Getters[key]>
};

export type ActionContext<State, Getters, Mutations, Actions> = {
    state: Defined<State, StateConstraint>,
    getters: Getters extends GetterConstraint ? GettersAsProperties<Getters> : never,
    commit: Mutations extends MutationConstraint ? Commit<Mutations> : never,
    dispatch: Actions extends ActionConstraint ? Dispatch<Actions> : never,
    loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
    req: Request,
    res: Response,
    isSSR: boolean
}

//creators
export type CreatorMeta<Kind extends "state" | "getters" | "mutations" | "actions" | "hooks" | "accessor" | "global_hooks"> = {
    __meta__: {
        moduleName: string,
        kind: Kind
    }
};

type State<Schema extends SchemaConstraint> = () => Defined<Schema["state"], StateConstraint>;
export type StateCreator<Schema extends SchemaConstraint> = (
    state: State<Schema>
) => State<Schema> & CreatorMeta<"state">

type Getters<Schema extends SchemaConstraint> = Schema["getters"] extends GetterConstraint ? {
    [key in keyof Schema["getters"]]: (
        state: Defined<Schema["state"], StateConstraint>,
        getters: GettersAsProperties<Schema["getters"]>
    ) => ReturnType<Defined<Schema["getters"], GetterConstraint>[key]>
} : never;
export type GetterCreator<Schema extends SchemaConstraint> = (
    getters: Getters<Schema>
) => Getters<Schema> & CreatorMeta<"getters">

type Mutations<Schema extends SchemaConstraint> = Schema["mutations"] extends MutationConstraint ? {
    [key in keyof Schema["mutations"]]: (
        state: Defined<Schema["state"], StateConstraint>,
        payload: Parameters<Defined<Schema["mutations"], MutationConstraint>[key]>[0]
    ) => ReturnType<Defined<Schema["mutations"], MutationConstraint>[key]>
} : never;
export type MutationCreator<Schema extends SchemaConstraint> = (
    mutations: Mutations<Schema>
) => Mutations<Schema> & CreatorMeta<"mutations">

type Actions<Schema extends SchemaConstraint> = Schema["actions"] extends ActionConstraint ? {
    [key in keyof Schema["actions"]]: (
        context: ActionContext<
            Defined<Schema["state"], StateConstraint>,
            Defined<Schema["getters"], GetterConstraint>,
            Defined<Schema["mutations"], MutationConstraint>,
            Defined<Schema["actions"], ActionConstraint>
        >,
        payload: Parameters<Defined<Schema["actions"], ActionConstraint>[key]>[0]
    ) => ReturnType<Defined<Schema["actions"], ActionConstraint>[key]>
} : never;
export type ActionCreator<Schema extends SchemaConstraint> = (
    actions: Actions<Schema>
) => Actions<Schema> & CreatorMeta<"actions">

type HookContextMetaData = {
    moduleName: string,
    actionName: string,
    hookName: string
};
type Hooks<Schema extends SchemaConstraint> = Schema["actions"] extends ActionConstraint ? Partial<{
    [key in keyof Schema["actions"] & string as `before:${key}`]: (
        hookContext: {
            req: Request,
            res: Response,
            isSSR: boolean,
            metadata: HookContextMetaData,
            loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
            actionPayload: Parameters<Schema["actions"][key]>[0]
        }
    ) => void
} & {
    //same as before:{key} but with an `unknown` actionPayload
    [key in keyof Schema["actions"] & string as "before:all"]: (
        hookContext: {
            req: Request,
            res: Response,
            isSSR: boolean,
            metadata: HookContextMetaData,
            loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
            actionPayload: unknown
        }
    ) => void
} & {
    [key in keyof Schema["actions"] & string as `after:${key}`]: (
        hookContext: {
            req: Request,
            res: Response,
            isSSR: boolean,
            metadata: HookContextMetaData,
            loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
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
            loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
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
            loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
            error: Error
        }
    ) => void
}> : never;
export type HooksCreator<Schema extends SchemaConstraint> = (
    hooks: Hooks<Schema>
) => Hooks<Schema> & CreatorMeta<"hooks">

export type Accessor<Schema extends SchemaConstraint> = {
    state: Defined<Schema["state"], StateConstraint>,
    getters: Schema["getters"] extends GetterConstraint ?
        GettersAsProperties<Schema["getters"]> : never,
    dispatch: Schema["actions"] extends ActionConstraint ?
        Dispatch<Schema["actions"]> : never
}
export type PreAccessorCreator<Schema extends SchemaConstraint> = (
    context: Context
) => Accessor<Schema>;
export type AccessorCreator<Schema extends SchemaConstraint> = PreAccessorCreator<Schema> & CreatorMeta<"accessor">;

type GlobalHooks = Partial<{
    before: (
        hookContext: {
            req: Request,
            res: Response,
            isSSR: boolean,
            metadata: HookContextMetaData,
            loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
            actionPayload: unknown
        }
    ) => void,
    after: (
        hookContext: {
            req: Request,
            res: Response,
            isSSR: boolean,
            metadata: HookContextMetaData,
            loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
            actionResult: unknown,
            mutations: {
                moduleName: string;
                mutation: string;
                payload: unknown;
            }[]
        }
    ) => void,
    error: (
        hookContext: {
            req: Request,
            res: Response,
            isSSR: boolean,
            metadata: HookContextMetaData,
            loadModule<M extends keyof Vue["$exful"] & string>(mod: M) : Promise<Vue["$exful"][M]>,
            error: Error
        }
    ) => void
}>;
export type GlobalHooksCreator = (
    hooks: GlobalHooks
) => GlobalHooks  & CreatorMeta<"global_hooks">

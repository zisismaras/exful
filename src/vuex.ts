import {IncomingMessage, OutgoingMessage} from "http";

type ActionConstraint = {[key: string]: (payload: any) => unknown};
type MutationConstraint = {[key: string]: (payload: any) => void};
type StateConstraint = Record<string, unknown>;
type GetterConstraint = {[key: string]: () => any};
type SchemaConstraint = Partial<{
    state: StateConstraint,
    getters: GetterConstraint,
    mutations: MutationConstraint,
    actions: ActionConstraint
}>;

type Optional<T, Constraint> = T extends Constraint ? T : never;

type Dispatch<Actions extends ActionConstraint> = {
    <key extends keyof Actions>(
        action: key,
        payload: Parameters<Actions[key]>[0]
    ): ReturnType<Actions[key]> extends Promise<any> ? ReturnType<Actions[key]> : Promise<ReturnType<Actions[key]>>
};

type Commit<Mutations extends MutationConstraint> = {
    <key extends keyof Mutations>(
        action: key,
        payload: Parameters<Mutations[key]>[0]
    ): ReturnType<Mutations[key]>
};

type GettersAsProperties<Getters extends GetterConstraint> = {
    [key in keyof Getters]: ReturnType<Getters[key]>
};

type ActionContext<State, Getters, Mutations, Actions> = {
    state: Optional<State, StateConstraint>,
    getters: Getters extends GetterConstraint ? GettersAsProperties<Getters> : never,
    commit: Mutations extends MutationConstraint ? Commit<Mutations> : never,
    dispatch: Actions extends ActionConstraint ? Dispatch<Actions> : never,
    loadModule<M extends keyof Vue["$store"]>(mod: M) : Promise<Vue["$store"][M]>,
    req: IncomingMessage,
    res: OutgoingMessage,
    isSSR: boolean
}

type StateCreator<Schema extends SchemaConstraint> = {
    (stateFn: () => Optional<Schema["state"], StateConstraint>): void
}

type GetterCreator<Schema extends SchemaConstraint> = {
    (
        getters: Schema["getters"] extends GetterConstraint ? {
            [key in keyof Schema["getters"]]: (
                state: Optional<Schema["state"], StateConstraint>,
                getters: GettersAsProperties<Schema["getters"]>
            ) => ReturnType<Optional<Schema["getters"], GetterConstraint>[key]>
        } : never
    ): void
}

type MutationCreator<Schema extends SchemaConstraint> = {
    (
        mutations: Schema["mutations"] extends MutationConstraint ? {
            [key in keyof Schema["mutations"]]: (
                state: Optional<Schema["state"], StateConstraint>,
                payload: Parameters<Optional<Schema["mutations"], MutationConstraint>[key]>[0]
            ) => ReturnType<Optional<Schema["mutations"], MutationConstraint>[key]>
        } : never
    ): void
}

type ActionCreator<Schema extends SchemaConstraint> = {
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

type Accessor<Schema extends SchemaConstraint> = {
    state: Optional<Schema["state"], StateConstraint>,
    getters: Schema["getters"] extends GetterConstraint ?
        GettersAsProperties<Schema["getters"]> : never,
    dispatch: Schema["actions"] extends ActionConstraint ?
        Dispatch<Schema["actions"]> : never
}

export function Module<Schema extends SchemaConstraint>(
    name: string
): {
    State: StateCreator<Schema>,
    Getters: GetterCreator<Schema>,
    Mutations: MutationCreator<Schema>,
    Actions: ActionCreator<Schema>,
    accessor: () => Accessor<Schema>
} {
    return {
        State: function(s) { return s; },
        Getters: function(g) { return g; },
        Mutations: function(m) { return m; },
        Actions: function(a) { return a; },
        //@ts-ignore
        accessor: function(instance) {
            //transform the vuex getters
            //myModule/myGetter => myGetter
            const myGetters = {};
            for (const key of Object.keys(instance.$__store__.getters)) {
                if (key.startsWith(`${name}/`)) {
                    Object.defineProperty(myGetters, key.replace(`${name}/`, ""), {
                        get: function() {
                            return instance.$__store__.getters[key];
                        }
                    });
                }
            }
            return {
                state: instance.$__store__.state[name],
                getters: myGetters,
                dispatch: async function(action: string, payload: unknown) {
                    if (process.client) {
                        //api call
                        const result = await instance.$axios.post(`/store/${name}/${action}`, {
                            connectionId: instance.nuxtState.$connectionId,
                            payload: payload
                        });
                        //apply mutations on actual store
                        for (const commit of result.data.mutations) {
                            instance.$__store__.commit(`${commit.moduleName}/${commit.mutation}`, commit.payload);
                        }
                        return result.data.actionResult;
                    } else {
                        //serverDispatcher
                        const result = await instance.$dispatch(instance.$connectionId, name, action, payload);
                        //apply mutations on actual store
                        for (const commit of result.mutations) {
                            instance.$__store__.commit(`${commit.moduleName}/${commit.mutation}`, commit.payload);
                        }
                        return result.actionResult;
                    }
                }
            };
        }
    };
}

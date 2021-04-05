import {
    SchemaConstraint,
    StateCreator,
    GetterCreator,
    MutationCreator,
    ActionCreator,
    HooksCreator,
    Accessor
} from "./types/public";

export function Module<Schema extends SchemaConstraint>(
    name: string
): {
    State: StateCreator<Schema>,
    Getters: GetterCreator<Schema>,
    Mutations: MutationCreator<Schema>,
    Actions: ActionCreator<Schema>,
    Hooks: HooksCreator<Schema>,
    accessor: () => Accessor<Schema>
} {
    const creators: ReturnType<typeof Module> = {
        State: function(s) {
            addMeta(s, name, "state");
            return s; 
        },
        Getters: function(g) {
            addMeta(g, name, "getters");
            return g;
        },
        Mutations: function(m) {
            addMeta(m, name, "mutations");
            return m;
        },
        Actions: function(a) {
            addMeta(a, name, "actions");
            return a;
        },
        Hooks: function(h) {
            addMeta(h, name, "hooks");
            return h;
        },
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
            const accessor = {
                state: instance.$__store__.state[name],
                getters: myGetters,
                dispatch: async function(action: string, payload: unknown) {
                    if (process.client) {
                        //api call
                        return instance.$schedule(async function() {
                            const result = await instance.$axios.post(`/store/${name}/${action}`, {
                                connectionId: instance.nuxtState.$connectionId,
                                payload: payload
                            });
                            //apply mutations on actual store
                            for (const commit of result.data.mutations) {
                                instance.$__store__.commit(`${commit.moduleName}/${commit.mutation}`, commit.payload);
                            }
                            return result.data.actionResult;
                        });
                    } else {
                        //serverDispatcher
                        const {status, result} = await instance.$dispatch(instance.$connectionId, name, action, payload);
                        if (status === "ok") {
                            //apply mutations on actual store
                            for (const commit of result.mutations) {
                                instance.$__store__.commit(`${commit.moduleName}/${commit.mutation}`, commit.payload);
                            }
                            return result.actionResult;
                        } else {
                            instance.error({statusCode: 500, message: "Internal server error"});
                        }
                    }
                }
            };

            //if you commit mutations from the devtools the state is replaced
            //so the reference we have is now invalid.
            //With a getter we can always point to the current state object
            if (process.client) {
                Object.defineProperty(accessor, "state", {
                    get: function() {
                        return instance.$__store__.state[name];
                    }
                });
            }

            return accessor;
        }
    };
    addMeta(creators.accessor, name, "accessor");

    return creators;
}

function addMeta(o: unknown, moduleName: string, kind: string) {
    if (!o) return;
    Object.defineProperty(o, "__meta__", {
        get() {
            return {
                moduleName,
                kind
            };
        },
        enumerable: false
    });
}

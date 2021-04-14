import {getAccessor} from "./accessor";
import {
    SchemaConstraint,
    StateCreator,
    GetterCreator,
    MutationCreator,
    ActionCreator,
    HooksCreator,
    AccessorCreator
} from "./types/public";

export function Module<Schema extends SchemaConstraint>(
    name: string
): {
    State: StateCreator<Schema>,
    Getters: GetterCreator<Schema>,
    Mutations: MutationCreator<Schema>,
    Actions: ActionCreator<Schema>,
    Hooks: HooksCreator<Schema>,
    accessor: AccessorCreator<Schema>
} {
    return {
        State: function(s) {
            return addMeta(s, name, "state"); 
        },
        Getters: function(g) {
            return addMeta(g, name, "getters");
        },
        Mutations: function(m) {
            return addMeta(m, name, "mutations");
        },
        Actions: function(a) {
            return addMeta(a, name, "actions");
        },
        Hooks: function(h) {
            return addMeta(h, name, "hooks");
        },
        accessor: addMeta(getAccessor(name), name, "accessor")
    };
}

function addMeta<T, K extends string>(
    o: T, moduleName: string,
    kind: K
): T & {__meta__: {moduleName: string, kind: K}} {
    if (o) {
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
    return o as T & {__meta__: {moduleName: string, kind: K}};
}

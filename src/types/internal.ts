import {
    Accessor,
    StateConstraint,
    GetterConstraint,
    ActionContext
} from "./public";
import {OptionalSpread} from "./utility";

//we don't use the standard MutationConstraint and ActionConstraint
//but instead we redefine them using the optionalSpread hack to make everyone happy

export type AbstractLoadedModule = Accessor<{
    state: StateConstraint,
    getters: GetterConstraint,
    actions: {[key: string]: (...payload: OptionalSpread<unknown>) => unknown};
}>;

export type AbstractActionContext = ActionContext<
    StateConstraint,
    GetterConstraint,
    {[key: string]: (...payload: OptionalSpread<unknown>) => void},
    {[key: string]: (...payload: OptionalSpread<unknown>) => unknown}
>;

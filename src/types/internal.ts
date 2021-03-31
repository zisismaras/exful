import {
    Accessor,
    StateConstraint,
    GetterConstraint,
    MutationConstraint,
    ActionConstraint,
    ActionContext
} from "./public";

export type AbstractLoadedModule = Accessor<{
    state: StateConstraint,
    getters: GetterConstraint,
    actions: ActionConstraint
}>;

export type AbstractActionContext = ActionContext<
    StateConstraint,
    GetterConstraint,
    MutationConstraint,
    ActionConstraint
>;

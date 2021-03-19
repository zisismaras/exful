import {Request, Response} from "express";
import {getState, updateState} from "./stateTree";
import {Mod} from "./actionServer";

export async function createActionContext(params: {
    connectionId: string,
    moduleName: string,
    moduleTree: {[key: string]: Mod},
    req: Request,
    res: Response,
    isSSR: boolean
}) {
    const currentStates: {[key: string]: Record<string, unknown>} = {};
    const myModule = params.moduleTree[params.moduleName];
    const state = await getState(
        params.connectionId,
        params.moduleName,
        myModule.state || function noState() { return {}; }
    );
    currentStates[params.moduleName] = state;
    const actualGetters = myModule.getters ? createGetters(myModule.getters, state) : {};
    const commitTracker: {moduleName: string, mutation: string, payload: unknown}[] = [];
    const actionContext = {
        state,
        getters: actualGetters,
        req: params.req,
        res: params.res,
        isSSR: params.isSSR,
        commit: function trackMutation(mutation: string, payload: unknown) {
            if (!myModule.mutations || !myModule.mutations[mutation]) {
                throw new Error(`Unknown mutation ${params.moduleName}/${mutation}`);
            }
            commitTracker.push({moduleName: params.moduleName, mutation, payload});
        },
        dispatch: function selfDispatch(action: string, payload: unknown) {
            if (!myModule.actions || !myModule.actions[action]) {
                throw new Error(`Unknown action ${params.moduleName}/${action}`);
            }
            return myModule.actions[action](actionContext, payload);
        },
        loadModule: async function(otherModuleName: string) {
            if (!Object.keys(params.moduleTree).includes(otherModuleName)) {
                throw new Error(`Unknown module ${otherModuleName}`);
            }
            const otherModule = params.moduleTree[otherModuleName];
            const otherModuleState = await getState(
                params.connectionId,
                otherModuleName,
                otherModule.state || function noState() { return {}; }
            );
            currentStates[otherModuleName] = otherModuleState;
            const otherModuleActualGetters = otherModule.getters
                ? createGetters(otherModule.getters, otherModuleState)
                : {};
            const otherModuleActionContext = {
                state: otherModuleState,
                getters: otherModuleActualGetters,
                req: params.req,
                res: params.res,
                isSSR: params.isSSR,
                commit: function trackMutation(mutation: string, payload: unknown) {
                    if (!otherModule.mutations || !otherModule.mutations[mutation]) {
                        throw new Error(`Unknown mutation ${otherModuleName}/${mutation}`);
                    }
                    commitTracker.push({moduleName: otherModuleName, mutation, payload});
                },
                dispatch: function(otherModuleActionName: string, otherModuleActionPayload: unknown) {
                    if (!otherModule.actions || !otherModule.actions[otherModuleActionName]) {
                        throw new Error(`Unknown action ${otherModuleName}/${otherModuleActionName}`);
                    }
                    return otherModule.actions[otherModuleActionName](otherModuleActionContext, otherModuleActionPayload);
                },
                loadModule: this.loadModule
            };

            return {
                state: otherModuleState,
                getters: otherModuleActualGetters,
                dispatch: otherModuleActionContext.dispatch
            };
        }
    };

    return {
        actionContext,
        commitTracker,
        currentStates
    };
}

export async function applyMutations(params: {
    connectionId: string,
    moduleTree: {[key: string]: Mod},
    commitTracker: {moduleName: string, mutation: string, payload: unknown}[],
    currentStates: {[key: string]: Record<string, unknown>}
}) {
    for (const commit of params.commitTracker) {
        const mutations = params.moduleTree[commit.moduleName].mutations;
        if (!mutations) continue;
        const currentState = params.currentStates[commit.moduleName];
        mutations[commit.mutation](currentState, commit.payload);
    }
    await updateState(params.connectionId, params.currentStates);
}

//create actual object getters with the getter functions
function createGetters(
    getters: {[key: string]: Function},
    state: Record<string, unknown>
): {[key: string]: unknown} {
    const actualGetters = {};
    for (const key of Object.keys(getters)) {
        Object.defineProperty(actualGetters, key, {
            get: function() {
                return getters[key](state, actualGetters);
            }
        });
    }
    return actualGetters;
}

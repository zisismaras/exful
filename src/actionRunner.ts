import {Request, Response} from "express";
import {getState, updateState} from "./stateTree";
import {Mod} from "./actionServer";
import {AbstractActionContext, AbstractLoadedModule} from "./exful";

type CommitTracker = {moduleName: string, mutation: string, payload: unknown}[];
type CurrentStates = {[key: string]: Record<string, unknown>};

//initializes our trackers and also loads the initial module we need to call
export async function startDispatchChain(params: {
    connectionId: string,
    initialModuleName: string,
    moduleTree: {[key: string]: Mod},
    req: Request,
    res: Response,
    isSSR: boolean
}): Promise<{
    initialModule: AbstractLoadedModule,
    applyMutations: () => Promise<CommitTracker>
}> {
    const commitTracker: CommitTracker = [];
    const currentStates: CurrentStates = {};
    const loadModule = getLoadModule({
        connectionId: params.connectionId,
        moduleTree: params.moduleTree,
        req: params.req,
        res: params.res,
        isSSR: params.isSSR,
        commitTracker,
        currentStates
    });

    return {
        initialModule: await loadModule(params.initialModuleName),
        applyMutations: async function() {
            await applyMutations({
                connectionId: params.connectionId,
                moduleTree: params.moduleTree,
                commitTracker,
                currentStates
            });
            return commitTracker;
        }
    };
}

//runs the mutations on the currentStates and calls stateTree.updateState() to persist them
//TODO to create the stateTree adapter system we can pass updateState() as a parameter here
async function applyMutations(params: {
    connectionId: string,
    moduleTree: {[key: string]: Mod},
    commitTracker: CommitTracker,
    currentStates: CurrentStates
}) {
    for (const commit of params.commitTracker) {
        const mutations = params.moduleTree[commit.moduleName].mutations;
        if (!mutations) continue;
        const currentState = params.currentStates[commit.moduleName];
        mutations[commit.mutation](currentState, commit.payload);
    }
    await updateState(params.connectionId, params.currentStates);
}

//creates actual object getters from the getter functions
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

//runs an action plus any hooks defined for that action
async function runAction(params: {
    moduleName: string,
    moduleTree: {[key: string]: Mod},
    commitTracker: CommitTracker,
    actionName: string,
    actionContext: AbstractActionContext,
    actionPayload: unknown,
    isSSR: boolean
}) {
    const mod = params.moduleTree[params.moduleName];
    let actionError: Error | null = null;
    try {
        if (!mod.actions || !mod.actions[params.actionName]) {
            throw new Error(`Unknown action ${params.moduleName}/${params.actionName}`);
        }
        //run before:all
        if (mod.hooks && mod.hooks["before:all"]) {
            await mod.hooks["before:all"]({
                req: params.actionContext.req,
                res: params.actionContext.res,
                isSSR: params.isSSR,
                metadata: {
                    moduleName: params.moduleName,
                    actionName: params.actionName,
                    hookName: "before:all"
                },
                loadModule: params.actionContext.loadModule
            });
        }
        //run before:{action}
        if (mod.hooks && mod.hooks[`before:${params.actionName}`]) {
            await mod.hooks[`before:${params.actionName}`]({
                req: params.actionContext.req,
                res: params.actionContext.res,
                isSSR: params.isSSR,
                metadata: {
                    moduleName: params.moduleName,
                    actionName: params.actionName,
                    hookName: `before:${params.actionName}`
                },
                loadModule: params.actionContext.loadModule
            });
        }
        //run the action
        const actionResult = await mod.actions[params.actionName](
            params.actionContext,
            params.actionPayload
        );
        //run after:{action}
        if (mod.hooks && mod.hooks[`after:${params.actionName}`]) {
            await mod.hooks[`after:${params.actionName}`]({
                req: params.actionContext.req,
                res: params.actionContext.res,
                isSSR: params.isSSR,
                metadata: {
                    moduleName: params.moduleName,
                    actionName: params.actionName,
                    hookName: `after:${params.actionName}`
                },
                loadModule: params.actionContext.loadModule,
                actionResult,
                mutations: params.commitTracker
            });
        }
        //run after:all
        if (mod.hooks && mod.hooks["after:all"]) {
            await mod.hooks["after:all"]({
                req: params.actionContext.req,
                res: params.actionContext.res,
                isSSR: params.isSSR,
                metadata: {
                    moduleName: params.moduleName,
                    actionName: params.actionName,
                    hookName: "after:all"
                },
                loadModule: params.actionContext.loadModule,
                actionResult,
                mutations: params.commitTracker
            });
        }
        
        return actionResult as unknown;
    } catch (e) {
        actionError = e;
        try {
            //run error:{action}
            if (mod.hooks && mod.hooks[`error:${params.actionName}`]) {
                await mod.hooks[`error:${params.actionName}`]({
                    req: params.actionContext.req,
                    res: params.actionContext.res,
                    isSSR: params.isSSR,
                    metadata: {
                        moduleName: params.moduleName,
                        actionName: params.actionName,
                        hookName: `error:${params.actionName}`
                    },
                    loadModule: params.actionContext.loadModule,
                    error: e
                });
            }
            //run error:all
            if (mod.hooks && mod.hooks["error:all"]) {
                await mod.hooks["error:all"]({
                    req: params.actionContext.req,
                    res: params.actionContext.res,
                    isSSR: params.isSSR,
                    metadata: {
                        moduleName: params.moduleName,
                        actionName: params.actionName,
                        hookName: "error:all"
                    },
                    loadModule: params.actionContext.loadModule,
                    error: e
                });
            }
        } catch (ee) {
            //TODO log.error that the error hooks also threw an error
            //just log this one and only re-throw the actual action error
        }
    }
    //re-throw the action error
    if (actionError) {
        throw actionError;
    }
}

//creates a loadModule function which will initialize any module
//with its state, getters and actionContext
function getLoadModule(params: {
    connectionId: string,
    moduleTree: {[key: string]: Mod},
    req: Request,
    res: Response,
    isSSR: boolean,
    commitTracker: CommitTracker,
    currentStates: CurrentStates
}): (moduleName: string) =>  Promise<AbstractLoadedModule> {
    return async function loadModule(moduleName) {
        if (!Object.keys(params.moduleTree).includes(moduleName)) {
            throw new Error(`Unknown module ${moduleName}`);
        }
        const mod = params.moduleTree[moduleName];
        const moduleState = await getState(
            params.connectionId,
            moduleName,
            mod.state || function noState() { return {}; }
        );
        params.currentStates[moduleName] = moduleState;
        const actualGetters = mod.getters
            ? createGetters(mod.getters, moduleState)
            : {};
        const actionContext = {
            state: moduleState,
            getters: actualGetters,
            req: params.req,
            res: params.res,
            isSSR: params.isSSR,
            commit: function(mutation: string, payload: unknown) {
                if (!mod.mutations || !mod.mutations[mutation]) {
                    throw new Error(`Unknown mutation ${moduleName}/${mutation}`);
                }
                params.commitTracker.push({moduleName: moduleName, mutation, payload});
            },
            dispatch: function(actionName: string, actionPayload: unknown) {
                return runAction({
                    moduleName,
                    moduleTree: params.moduleTree,
                    commitTracker: params.commitTracker,
                    actionName,
                    actionContext,
                    actionPayload,
                    isSSR: params.isSSR
                });
            },
            loadModule: loadModule
        };

        return {
            state: moduleState,
            getters: actualGetters,
            dispatch: actionContext.dispatch
        };
    };
}

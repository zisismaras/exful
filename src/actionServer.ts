import {readdirSync, existsSync, statSync} from "fs";
import Express from "express";
import {createActionContext, applyMutations, runAction} from "./actionRunner";
import {renewConnection} from "./stateTree";

//on development don't cache required store modules
let storeRequire = require;
if (process.env.NODE_ENV !== "production") {
    storeRequire = require("import-fresh");
}

//@ts-ignore check comment in index.ts about the global
const storeDir: string = global.__nuxtRootStoreDir;
if (!existsSync(storeDir) || !statSync(storeDir).isDirectory()) {
    throw new Error("No store directory");
}
const moduleDirs = readdirSync(storeDir).filter(function(dir) {
    return statSync(`${storeDir}/${dir}`).isDirectory();
}).map(function(dir) {
    return {
        name: dir,
        directory: `${storeDir}/${dir}`
    };
});

export type Mod = Partial<{
    state: () => Record<string, unknown>,
    actions: {[key: string]: Function},
    mutations: {[key: string]: Function},
    getters: {[key: string]: Function},
    hooks: {[key: string]: Function},
    accessor: unknown
}>;

const moduleTree: {
    [key: string]: Mod
} = {};

for (const {name, directory} of moduleDirs) {
    //TODO more checks here, now the functions just return the input as is
    //they should at least include a "type" field "actions", "state" etc
    const mod: Mod = {};
    try {
        const state = storeRequire(`${directory}/state`).default;
        if (state) {
            mod.state = state;
        }
    } catch (_e) {}
    try {
        const actions = storeRequire(`${directory}/actions`).default;
        if (actions) {
            mod.actions = actions;
        }
    } catch (_e) {}
    try {
        const mutations = storeRequire(`${directory}/mutations`).default;
        if (mutations) {
            mod.mutations = mutations;
        }
    } catch (_e) {}
    try {
        const getters = storeRequire(`${directory}/getters`).default;
        if (getters) {
            mod.getters = getters;
        }
    } catch (_e) {}
    try {
        const hooks = storeRequire(`${directory}/hooks`).default;
        if (hooks) {
            mod.hooks = hooks;
        }
    } catch (_e) {}
    if (Object.keys(mod).length > 0) {
        moduleTree[name] = mod;
    }
}

const app = Express();
app.disable("x-powered-by");
app.use(Express.json());

const moduleNames = Object.keys(moduleTree);
app.put("/ping/:connectionId", async function(req, res) {
    try {
        await renewConnection(req.params.connectionId, moduleNames);
        res.setHeader("Cache-Control", "no-cache");
        res.send("pong");
    } catch (e) {
        //TODO log.error
    }
});

for (const [moduleName, mod] of Object.entries(moduleTree)) {
    if (!mod.actions) continue;
    for (const actionName of Object.keys(mod.actions)) {
        app.post(`/${moduleName}/${actionName}`, async function(req, res) {
            try {
                const {actionContext, commitTracker, currentStates} = await createActionContext({
                    connectionId: req.body.connectionId,
                    moduleName,
                    moduleTree,
                    req,
                    res,
                    isSSR: false
                });
                const actionResult = await runAction({
                    moduleName,
                    moduleTree,
                    commitTracker,
                    actionName,
                    actionContext,
                    actionPayload: req.body.payload,
                    isSSR: false
                });
                await applyMutations({
                    connectionId: req.body.connectionId,
                    moduleTree,
                    commitTracker,
                    currentStates
                });
                if (!res.headersSent) {
                    //TODO log.error if headersSent "dont't modify store response"
                    res.json({
                        actionResult,
                        mutations: commitTracker
                    });
                }
            } catch (e) {
                //TODO log.error the error
                console.error(e);
                //return default error response
                if (!res.headersSent) {
                    res.status(500).json({
                        message: "Internal server error"
                    });
                }
            }
        });
    }
}

export default app;

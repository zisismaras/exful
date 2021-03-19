import {resolve} from "path";
import {readdirSync, existsSync, statSync} from "fs";
import Express from "express";
import {createActionContext, applyMutations} from "./actionRunner";
import {renewConnection} from "./stateTree";

//on development always require store modules
let storeRequire = require;
if (process.env.NODE_ENV !== "production") {
    storeRequire = require("import-fresh");
}

//TODO hardcoded
//need to find a way to use rootDir like buildtime
const storeDir = resolve("..", "rocketsaas-nuxt", "store");
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
    if (Object.keys(mod).length > 0) {
        moduleTree[name] = mod;
    }
}

const app = Express();
app.disable("x-powered-by");
app.use(Express.json());

const moduleNames = Object.keys(moduleTree);
app.put("/ping/:connectionId", async function(req, res) {
    await renewConnection(req.params.connectionId, moduleNames);
    res.setHeader("Cache-Control", "no-cache");
    res.send("pong");
});

for (const [moduleName, mod] of Object.entries(moduleTree)) {
    if (!mod.actions) continue;
    for (const [actionName, actionFn] of Object.entries(mod.actions)) {
        app.post(`/${moduleName}/${actionName}`, async function(req, res) {
            const {actionContext, commitTracker, currentStates} = await createActionContext({
                connectionId: req.body.connectionId,
                moduleName,
                moduleTree,
                req,
                res,
                isSSR: false
            });
            const actionResult = await actionFn(actionContext, req.body.payload);
            await applyMutations({
                connectionId: req.body.connectionId,
                moduleTree,
                commitTracker,
                currentStates
            });
            res.json({
                actionResult,
                mutations: commitTracker
            });
        });
    }
}

export default app;

import Express from "express";
import {logger} from "./logger";
import {getDiscover, getGlobalHooksDiscover} from "./discover";
import {startDispatchChain} from "./actionRunner";
import {renewConnection} from "./stateTree";

export type Mod = Partial<{
    state: () => Record<string, unknown>,
    actions: {[key: string]: Function},
    mutations: {[key: string]: Function},
    getters: {[key: string]: Function},
    hooks: {[key: string]: Function}
}>;

export type GlobalHooks = Partial<{
    before: Function,
    after: Function,
    error: Function
}>[];

const discover = getDiscover(global.exful.dir);
const globalHooksDiscover = getGlobalHooksDiscover(global.exful.dir);
const moduleTree = discover("loaded") as {
    [key: string]: Mod
};
const globalHooks = globalHooksDiscover("loaded") as GlobalHooks;

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
        logger.error(e);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

for (const [moduleName, mod] of Object.entries(moduleTree)) {
    if (!mod.actions) continue;
    for (const actionName of Object.keys(mod.actions)) {
        app.post(`/${moduleName}/${actionName}`, async function(req, res) {
            try {
                const {initialModule, applyMutations} = await startDispatchChain({
                    connectionId: req.body.connectionId,
                    initialModuleName: moduleName,
                    moduleTree,
                    globalHooks,
                    req,
                    res,
                    isSSR: false
                });
                const actionResult = await initialModule.dispatch(actionName, req.body.payload);
                const mutations = await applyMutations();
                if (res.headersSent && res.statusCode < 400) {
                    logger.warn("[exful] Non-error action responses should not be modified");
                }
                if (!res.headersSent) {
                    res.json({
                        actionResult,
                        mutations
                    });
                }
            } catch (e) {
                logger.error(e);
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

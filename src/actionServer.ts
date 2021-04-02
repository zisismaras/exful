import Express from "express";
import {getDiscover} from "./discover";
import {startDispatchChain} from "./actionRunner";
import {renewConnection} from "./stateTree";

export type Mod = Partial<{
    state: () => Record<string, unknown>,
    actions: {[key: string]: Function},
    mutations: {[key: string]: Function},
    getters: {[key: string]: Function},
    hooks: {[key: string]: Function}
}>;

//@ts-ignore check comment in index.ts about the global
const storeDir: string = global.__nuxtRootStoreDir;
const discover = getDiscover(storeDir);
const moduleTree = discover("loaded") as {
    [key: string]: Mod
};

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
                const {initialModule, applyMutations} = await startDispatchChain({
                    connectionId: req.body.connectionId,
                    initialModuleName: moduleName,
                    moduleTree,
                    req,
                    res,
                    isSSR: false
                });
                const actionResult = await initialModule.dispatch(actionName, req.body.payload);
                const mutations = await applyMutations();
                if (!res.headersSent) {
                    //TODO log.error if headersSent "dont't modify store response"
                    res.json({
                        actionResult,
                        mutations
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

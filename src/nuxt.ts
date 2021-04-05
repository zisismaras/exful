import {join} from "path";
import {utimesSync} from "fs";
import {Module} from "@nuxt/types";
import {getDiscover} from "./discover";

const exful: Module = function(_moduleOptions: unknown) {
    //disable core vuex
    if (this.options.features) {
        this.options.features.store = false;
    }

    this.nuxt.options.alias["~exful"] = __dirname;
    this.nuxt.options.alias["~express"] = join(__dirname, "..", "node_modules", "express", "lib");

    this.addPlugin({
        src: join(__dirname, "createConnection.js"),
        fileName: "./exful/createConnection.js",
        mode: "server"
    });

    this.addPlugin({
        src: join(__dirname, "ping.js"),
        fileName: "./exful/ping.js",
        mode: "client"
    });

    this.addPlugin({
        src: join(__dirname, "scheduler.js"),
        fileName: "./exful/scheduler.js",
        mode: "client"
    });

    const nuxtRootStoreDir = join(this.options.rootDir, "store");

    const moduleLoaderPath = join(__dirname, "..", "templates", "moduleLoader.js");
    this.addPlugin({
        src: moduleLoaderPath,
        fileName: "./exful/modules.js",
        options: {
            discover: getDiscover(nuxtRootStoreDir, "../../store")
        }
    });

    const serverDispatcherPath = join(__dirname, "..", "templates",  "serverDispatcher.js");
    this.addPlugin({
        src: serverDispatcherPath,
        fileName: "./exful/serverDispatcher.js",
        mode: "server",
        options: {
            discover: getDiscover(nuxtRootStoreDir, "../../store"),
            enableSSRExpressReqRes: true //TODO from moduleOptions
        }
    });

    /*
        Can't think of a good way to pass the rootDir to the serverMiddleware
        while also having working server reloads on store change in development.
        So we'll just use a global.
    */
    //@ts-ignore
    global.__nuxtRootStoreDir = nuxtRootStoreDir;
    const actionServerPath = join(__dirname, "actionServer.js");
    this.addServerMiddleware({
        path: "/store",
        handler: actionServerPath
    });

    //the types are generated in the root directory, so ts can pick it up
    const typeLoaderPath = join(__dirname, "..", "templates",  "typeLoader.js");
    this.addPlugin({
        src: typeLoaderPath,
        fileName: "../storeTypes.ts",
        options: {
            discover: getDiscover(nuxtRootStoreDir, "./store")
        }
    });

    //on development watch the store directory and trigger reloads
    if (process.env.NODE_ENV !== "production") {
        const storeWatcher = require("chokidar").watch(
            join(this.options.rootDir, "/store/**/*"),
            {ignoreInitial: true}
        );
        storeWatcher.on("all", function() {
            const d = Date.now();
            utimesSync(actionServerPath, d, d);
            utimesSync(typeLoaderPath, d, d);
            utimesSync(moduleLoaderPath, d, d);
            utimesSync(serverDispatcherPath, d, d);
        });
    }
};

export default exful;

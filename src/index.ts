import {join} from "path";
import {utimesSync} from "fs";
import {Module} from "@nuxt/types";
import {discover} from "./discover";

const collider: Module = function(_moduleOptions: unknown) {
    //disable core vuex
    if (this.options.features) {
        this.options.features.store = false;
    }

    //TODO library files (things we just need to import, not to use them as plugins)
    //could be added as templates .addTemplate
    this.addPlugin({
        src: join(__dirname, "stateTree.js"),
        fileName: "./collider/stateTree.js",
        mode: "server"
    });

    this.addPlugin({
        src: join(__dirname, "actionRunner.js"),
        fileName: "./collider/actionRunner.js",
        mode: "server"
    });

    this.addPlugin({
        src: join(__dirname, "createConnection.js"),
        fileName: "./collider/createConnection.js",
        mode: "server"
    });

    this.addPlugin({
        src: join(__dirname, "ping.js"),
        fileName: "./collider/ping.js",
        mode: "client"
    });

    const moduleLoaderPath = join(__dirname, "..", "templates", "moduleLoader.js");
    this.addPlugin({
        src: join(__dirname, "..", "templates", "moduleLoader.js"),
        fileName: "./collider/modules.ts",
        options: {
            discover: discover.bind(this)
        }
    });

    const serverDispatcherPath = join(__dirname, "..", "templates",  "serverDispatcher.js");
    this.addPlugin({
        src: join(__dirname, "..", "templates",  "serverDispatcher.js"),
        fileName: "./collider/serverDispatcher.ts",
        mode: "server",
        options: {
            discover: discover.bind(this)
        }
    });

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
            discover: discover.bind(this)
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

export default collider;

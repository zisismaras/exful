import {join} from "path";
import {utimesSync} from "fs";
import {Module} from "@nuxt/types";
import {getDiscover} from "./discover";

const exful: Module = function(_moduleOptions: unknown) {
    this.nuxt.options.alias["~exful"] = __dirname;
    this.nuxt.options.alias["~express"] = join(__dirname, "..", "node_modules", "express", "lib");

    this.addPlugin({
        src: join(__dirname, "plugins", "init.server.js"),
        fileName: "./exful/init.js",
        mode: "server"
    });

    this.addPlugin({
        src: join(__dirname, "plugins", "ping.client.js"),
        fileName: "./exful/ping.js",
        mode: "client"
    });

    this.addPlugin({
        src: join(__dirname, "plugins", "scheduler.client.js"),
        fileName: "./exful/scheduler.js",
        mode: "client"
    });

    const exfulDir = join(this.options.rootDir, "exful");
    //TODO dir not exists?

    const moduleLoaderPath = join(__dirname, "..", "templates", "moduleLoader.js");
    this.addPlugin({
        src: moduleLoaderPath,
        fileName: "./exful/modules.js",
        options: {
            discover: getDiscover(exfulDir, "../../exful")
        }
    });

    const serverDispatcherPath = join(__dirname, "..", "templates",  "serverDispatcher.js");
    this.addPlugin({
        src: serverDispatcherPath,
        fileName: "./exful/serverDispatcher.js",
        mode: "server",
        options: {
            discover: getDiscover(exfulDir, "../../exful"),
            enableSSRExpressReqRes: true //TODO from moduleOptions
        }
    });

    //the types are generated in the root directory, so ts can pick it up
    const typeLoaderPath = join(__dirname, "..", "templates",  "typeLoader.js");
    this.addTemplate({
        src: typeLoaderPath,
        fileName: "../exfulTypes.ts",
        options: {
            discover: getDiscover(exfulDir, "./exful")
        }
    });

    global.exful = {dir: exfulDir};
    const actionServerPath = join(__dirname, "actionServer.js");
    this.addServerMiddleware({
        path: "/exful",
        handler: actionServerPath
    });

    //on development watch the exful directory and trigger reloads
    if (process.env.NODE_ENV !== "production") {
        const watcher = require("chokidar").watch(
            join(this.options.rootDir, "/exful/**/*"),
            {ignoreInitial: true}
        );
        watcher.on("all", function() {
            const d = Date.now();
            utimesSync(actionServerPath, d, d);
            utimesSync(typeLoaderPath, d, d);
            utimesSync(moduleLoaderPath, d, d);
            utimesSync(serverDispatcherPath, d, d);
        });
    }
};

export default exful;

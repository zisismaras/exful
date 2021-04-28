import {join} from "path";
import {utimesSync} from "fs";
import {Module} from "@nuxt/types";
import {getDiscover} from "../discover";
import {setDefaultOptions} from "./options";
import {ExfulOptions} from "../types/extendedOptions";

const exfulBuild: Module = function() {
    setDefaultOptions(this.options);
    const exfulOptions = this.options.exful as ExfulOptions;
    const exfulDir = join(this.options.rootDir, "exful");

    this.nuxt.options.alias["~exful"] = join(__dirname, "..");
    this.nuxt.options.alias["~express"] = join(
        __dirname,
        "..",
        "..",
        "node_modules",
        "express",
        "lib"
    );

    this.addPlugin({
        src: join(__dirname, "..", "plugins", "init.server.js"),
        fileName: "./exful/init.js",
        mode: "server"
    });

    this.addPlugin({
        src: join(__dirname, "..", "plugins", "scheduler.client.js"),
        fileName: "./exful/scheduler.js",
        mode: "client"
    });

    this.addPlugin({
        src: join(__dirname, "..", "..", "templates", "ping.js"),
        fileName: "./exful/ping.js",
        mode: "client",
        options: {
            pingInterval: exfulOptions.backend.pingInterval
        }
    });

    const moduleLoaderPath = join(__dirname, "..", "..", "templates", "moduleLoader.js");
    this.addPlugin({
        src: moduleLoaderPath,
        fileName: "./exful/modules.js",
        options: {
            discover: getDiscover(exfulDir, "../../exful")
        }
    });

    const serverDispatcherPath = join(__dirname, "..", "..", "templates",  "serverDispatcher.js");
    this.addPlugin({
        src: serverDispatcherPath,
        fileName: "./exful/serverDispatcher.js",
        mode: "server",
        options: {
            discover: getDiscover(exfulDir, "../../exful"),
            enableSSRExpressReqRes: exfulOptions.experimental.enableSSRExpressReqRes
        }
    });

    //the types are generated in the root directory, so ts can pick it up
    const typeLoaderPath = join(__dirname, "..", "..", "templates",  "typeLoader.js");
    this.addTemplate({
        src: typeLoaderPath,
        fileName: "../exfulTypes.ts",
        options: {
            discover: getDiscover(exfulDir, "./exful")
        }
    });

    //on development watch the exful directory and trigger reloads
    if (process.env.NODE_ENV !== "production") {
        const actionServerPath = join(__dirname, "..", "actionServer.js");
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

export default exfulBuild;

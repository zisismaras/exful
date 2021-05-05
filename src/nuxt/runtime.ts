import {join} from "path";
import {Module} from "@nuxt/types";
import chalk from "chalk";
import {setDefaultOptions} from "./options";
import {initializeStateTree} from "../stateTree";
import {ExfulOptions} from "../types/extendedOptions";

const pkg = require("../../package.json");

const exfulRuntime: Module = function() {
    setDefaultOptions(this.options);
    const options = this.options.exful as ExfulOptions;
    initializeStateTree(options.backend);
    const exfulDir = join(this.options.rootDir, "exful");
    global.exful = {dir: exfulDir};
    const actionServerPath = join(__dirname, "..", "actionServer.js");
    this.addServerMiddleware({
        path: "/exful",
        handler: actionServerPath
    });
    this.nuxt.hook("listen", () => {
        const label = (name: string) => chalk.bold.cyan(`▸ ${name}:`);
        this.nuxt.options.cli.badgeMessages.push(
            `${label("Exful version")} ${pkg.version}`,
            `${label("Exful backend")} ${options.backend.type}`
        );
    });
};

export default exfulRuntime;

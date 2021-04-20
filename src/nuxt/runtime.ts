import {join} from "path";
import {Module} from "@nuxt/types";
import {setDefaultOptions} from "./options";

const exfulRuntime: Module = function() {
    setDefaultOptions(this.options);
    const exfulDir = join(this.options.rootDir, "exful");
    global.exful = {dir: exfulDir};
    const actionServerPath = join(__dirname, "..", "actionServer.js");
    this.addServerMiddleware({
        path: "/exful",
        handler: actionServerPath
    });
};

export default exfulRuntime;

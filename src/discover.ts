import {join} from "path";
import {readdirSync, existsSync, statSync} from "fs";
import {ModuleThis} from "@nuxt/types/config/module";
import importFresh from "import-fresh";

export function discover(this: ModuleThis) {
    const storeDir = join(this.options.rootDir, "store");
    if (!existsSync(storeDir) || !statSync(storeDir).isDirectory()) {
        // throw new Error("No store directory");
        return [];
    }
    const modules = readdirSync(storeDir).filter(function(dir) {
        if (!statSync(`${storeDir}/${dir}`).isDirectory()) {
            return false;
        }
        const moduleIndex = `${storeDir}/${dir}/index.ts`;
        if (!existsSync(moduleIndex) || !statSync(moduleIndex).isFile()) {
            return false;
        }
        if (!importFresh<any>(moduleIndex).accessor) {
            return false;
        }
        return true;
    }).map(function(dir) {
        return {
            //TODO we should normalize the name, it must not contain - or symbols (we use them as a variable in the templates)
            name: dir,
            directory: `${storeDir}/${dir}`
        };
    }).map(function(mod) {
        return {
            name: mod.name,
            root: mod.directory,
            state: `${mod.directory}/state.ts`,
            mutations: `${mod.directory}/mutations.ts`,
            getters: `${mod.directory}/getters.ts`,
            actions: `${mod.directory}/actions.ts`
        };
    }).map(function(mod) {
        if (!existsSync(mod.state) || !statSync(mod.state).isFile() || !importFresh<any>(mod.state).default) {
            //@ts-ignore
            delete mod.state;
        }
        if (!existsSync(mod.mutations) || !statSync(mod.mutations).isFile() || !importFresh<any>(mod.mutations).default) {
            //@ts-ignore
            delete mod.mutations;
        }
        if (!existsSync(mod.getters) || !statSync(mod.getters).isFile() || !importFresh<any>(mod.getters).default) {
            //@ts-ignore
            delete mod.getters;
        }
        if (!existsSync(mod.actions) || !statSync(mod.actions).isFile() || !importFresh<any>(mod.actions).default) {
            //@ts-ignore
            delete mod.actions;
        }
        return mod;
    });

    return modules;
}

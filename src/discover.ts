import {readdirSync, existsSync, statSync} from "fs";
import importFresh from "import-fresh";

/*
    We do all the loading and checking based on the absolute `nuxtRootStoreDir`
    but at the end we replace the absolute dir with a relative one so
    the generated templates won't have absolute paths in their imports.

    This probably doesn't matter since webpack will just load and bundle the file in either way.
*/

export function getDiscover(relativeStoreDir: string, nuxtRootStoreDir: string) {
    return function discover() {
        if (!existsSync(nuxtRootStoreDir) || !statSync(nuxtRootStoreDir).isDirectory()) {
            // throw new Error("No store directory");
            return [];
        }
        const modules = readdirSync(nuxtRootStoreDir).filter(function(dir) {
            if (!statSync(`${nuxtRootStoreDir}/${dir}`).isDirectory()) {
                return false;
            }
            //TODO check for .ts and .js files (bellow as well)
            const moduleIndex = `${nuxtRootStoreDir}/${dir}/index.ts`;
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
                directory: `${nuxtRootStoreDir}/${dir}`
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
        }).map(function(mod) {
            mod.root = mod.root.replace(nuxtRootStoreDir, relativeStoreDir);
            if (mod.state) {
                mod.state = mod.state.replace(nuxtRootStoreDir, relativeStoreDir);
            }
            if (mod.mutations) {
                mod.mutations = mod.mutations.replace(nuxtRootStoreDir, relativeStoreDir);
            }
            if (mod.getters) {
                mod.getters = mod.getters.replace(nuxtRootStoreDir, relativeStoreDir);
            }
            if (mod.actions) {
                mod.actions = mod.actions.replace(nuxtRootStoreDir, relativeStoreDir);
            }
            return mod;
        });
    
        return modules;
    };
}

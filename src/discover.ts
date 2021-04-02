import {readdirSync, existsSync, statSync} from "fs";

//on development don't cache required store modules
let requirePart = require;
if (process.env.NODE_ENV !== "production") {
    requirePart = require("import-fresh");
}

const VALID_KINDS = ["state", "getters", "mutations", "actions", "hooks"];
const VALID_NAME = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

export function getDiscover(nuxtRootStoreDir: string, relativeStoreDir?: string) {
    return function discover(result: "paths" | "loaded") {
        if (!existsSync(nuxtRootStoreDir) || !statSync(nuxtRootStoreDir).isDirectory()) {
            if (result === "loaded") {
                return {};
            } else {
                return [];
            }
        }
        const modules = readdirSync(nuxtRootStoreDir).filter(function(dir) {
            if (!statSync(`${nuxtRootStoreDir}/${dir}`).isDirectory()) {
                return false;
            }
            return true;
        }).map(function(dir) {
            return {
                name: dir,
                directory: dir,
                absoluteDirectory: `${nuxtRootStoreDir}/${dir}`
            };
        });
        for (const mod of Object.values(modules)) {
            if (!VALID_NAME.test(mod.name)) {
                throw new Error(`Module name (${mod.name}) is not a valid javascript variable name`);
            }
        }

        const moduleMap: {
            [moduleName: string]: {
                [kind: string]: {
                    path: string,
                    loaded: any
                }
            }
        } = {};
        for (const mod of modules) {
            moduleMap[mod.name] = {};
            const parts = readdirSync(mod.absoluteDirectory).filter(function(p) {
                return p.endsWith(".js") || p.endsWith(".ts");
            });
            for (const part of parts) {
                const partPath = `${nuxtRootStoreDir}/${mod.directory}/${part}`;
                const loaded = requirePart(partPath);
                if (loaded?.accessor?.__meta__?.kind === "accessor") {
                    if (mod.name !== loaded.accessor.__meta__.moduleName) {
                        throw new Error(`Module name (${loaded.accessor.__meta__.moduleName}) does not match the directory name (${mod.name})`);
                    }
                    moduleMap[mod.name].root = {
                        path: partPath.replace(/\.js|\.ts$/, ""),
                        loaded: loaded.accessor
                    };
                } else if (loaded?.default?.__meta__?.kind && VALID_KINDS.includes(loaded.default.__meta__.kind)) {
                    moduleMap[mod.name][loaded.default.__meta__.kind] = {
                        path: partPath.replace(/\.js|\.ts$/, ""),
                        loaded: loaded.default
                    };
                } else {
                    continue;
                }
            }
        }

        /*
            We do all the loading and checking based on the absolute `nuxtRootStoreDir`
            but at the end we replace the absolute dir with a relative one so
            the generated templates won't have absolute paths in their imports.
            This probably doesn't matter since webpack will just load and bundle the file in either way.
        */
        if (relativeStoreDir) {
            for (const mod of Object.values(moduleMap)) {
                for (const kind of Object.values(mod)) {
                    kind.path = kind.path.replace(nuxtRootStoreDir, relativeStoreDir);
                }
            }
        }

        /*
            discover() will be called from plugin templates and the actionServer.
            The plugins need only the paths so they can form the imports themselves.
            The actionServer needs the loaded modules to run them.
            We return a different data format in each case to better fit the caller.
        */
        if (result === "loaded") {
            const loadedMap: {[key: string]: {[key: string]: Function}} = {};
            for (const [moduleName, mod] of Object.entries(moduleMap)) {
                loadedMap[moduleName] = {};
                for (const [kindName, kind] of Object.entries(mod)) {
                    loadedMap[moduleName][kindName] = kind.loaded; 
                }
            }
            return loadedMap;
        } else {
            const pathMap = [];
            for (const [moduleName, mod] of Object.entries(moduleMap)) {
                const current: {[key: string]: string} = {name: moduleName};
                for (const [kindName, kind] of Object.entries(mod)) {
                    current[kindName] = kind.path; 
                }
                pathMap.push(current);
            }
            return pathMap;
        }
    };
}

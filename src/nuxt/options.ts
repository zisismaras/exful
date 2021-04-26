import {NuxtOptions} from "@nuxt/types";

export function setDefaultOptions(options: NuxtOptions) {
    options.exful = options.exful || {};

    //default express ssr req/res by default true
    options.exful.experimental = options.exful.experimental || {};
    options.exful.experimental.enableSSRExpressReqRes === false ?
        options.exful.experimental.enableSSRExpressReqRes = false :
        options.exful.experimental.enableSSRExpressReqRes = true;

    //default pingInterval
    options.exful.pingInterval = options.exful.pingInterval || 5 * 60 * 1000;

    options.exful.backend = options.exful.backend || {};
    //default backend
    if (!options.exful.backend.type) {
        options.exful.backend.type = "memory";
    }
    if (options.exful.backend.type !== "memory" && options.exful.backend.type !== "redis") {
        options.exful.backend.type = "memory";
    }
    //default connectionTTL if redis
    if (options.exful.backend.type === "redis") {
        options.exful.backend.connectionTTL = options.exful.backend.connectionTTL || 3600;
        if (options.exful.pingInterval / 1000 > options.exful.backend.connectionTTL) {
            throw new Error("[exful] pingInterval can't be greater than connectionTTL");
        }
    }
}

import {NuxtOptions} from "@nuxt/types";

export function setDefaultOptions(options: NuxtOptions) {
    options.exful = options.exful || {};

    //default express ssr req/res by default true
    options.exful.experimental = options.exful.experimental || {};
    options.exful.experimental.enableSSRExpressReqRes === false ?
        options.exful.experimental.enableSSRExpressReqRes = false :
        options.exful.experimental.enableSSRExpressReqRes = true;

    options.exful.backend = options.exful.backend || {};

    //default backend
    if (!options.exful.backend.type) {
        options.exful.backend.type = "memory";
    }
    if (options.exful.backend.type !== "memory" && options.exful.backend.type !== "redis") {
        options.exful.backend.type = "memory";
    }

    //all intervals are in seconds

    //default connectionTTL
    options.exful.backend.connectionTTL = options.exful.backend.connectionTTL || 3600;

    //default pingInterval
    options.exful.backend.pingInterval = options.exful.backend.pingInterval || 360;
    if (options.exful.backend.pingInterval > options.exful.backend.connectionTTL) {
        throw new Error("[exful] pingInterval can't be greater than connectionTTL");
    }

    //default checkExpiredInterval
    if (options.exful.backend.type === "memory") {
        options.exful.backend.checkExpiredInterval = options.exful.backend.checkExpiredInterval || 60;
    }
}

import "@nuxt/types";
import {NuxtOptions} from "@nuxt/types";
import {RedisOptions} from "ioredis";
import {DeepPartial} from "ts-essentials";

export type ExfulOptions = {
    experimental: {
        enableSSRExpressReqRes: boolean
    },
    backend: {
        type: "redis",
        options: RedisOptions,
        connectionTTL: number
    } | {
        type: "memory"
    },
    pingInterval: number
};

declare module "@nuxt/types" {
    interface NuxtOptions {
        exful?: DeepPartial<ExfulOptions>
    }
}

//@ts-ignore just to silence the variable-is-unused error without ts-ignoring the import itself
type _Unused = [NuxtOptions];

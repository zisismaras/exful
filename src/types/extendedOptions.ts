import "@nuxt/types";
import {NuxtOptions} from "@nuxt/types";
import {RedisOptions} from "ioredis";
import {DeepPartial} from "ts-essentials";

export type ExfulOptions = {
    experimental: {
        enableSSRExpressReqRes: boolean
    },
    backend: ({
        type: "redis",
        connectionOptions: RedisOptions
    } | {
        type: "memory",
        checkExpiredInterval: number
    }) & {
        pingInterval: number,
        connectionTTL: number
    }
};

export type PartialExfulOptions = DeepPartial<ExfulOptions>;

declare module "@nuxt/types" {
    interface NuxtOptions {
        exful?: PartialExfulOptions
    }
}

//@ts-ignore just to silence the variable-is-unused error without ts-ignoring the import itself
type _Unused = [NuxtOptions];

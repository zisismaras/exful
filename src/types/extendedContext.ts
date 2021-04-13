import "@nuxt/types";
import Vue from "vue";
import {Context, NuxtAppOptions} from "@nuxt/types";
import {AbstractLoadedModule} from "./internal";

type ExfulContext = {
    connectionId: string,
    vuexStore: Context["store"],
    schedule: (cb: () => unknown) => Promise<unknown>,
    dispatch: (
        connectionId: string,
        moduleName: string,
        actionName: string,
        actionPayload: unknown
    ) => Promise<{
        status: "ok",
        result: {
            actionResult: unknown,
            mutations: {moduleName: string, mutation: string, payload: unknown}[]
        }
    } | {
        status: "error"
    }>,
    inject: <T extends keyof ExfulContext & string>(property: T, value: ExfulContext[T]) => void
};
declare module "@nuxt/types" {
    interface Context {
        $__exful: ExfulContext,
        $exful: {
            [moduleName: string]: AbstractLoadedModule
        }
    }
    interface NuxtAppOptions {
        $__exful: ExfulContext,
        $exful: {
            [moduleName: string]: AbstractLoadedModule
        }
    }
}

declare module "vue/types/vue" {
    interface Vue {
        $exful: {
            [moduleName: string]: AbstractLoadedModule
        }
    }
}

//@ts-ignore just to silence the variable-is-unused error without ts-ignoring the import itself
type _Unused = [Vue, Context, NuxtAppOptions];

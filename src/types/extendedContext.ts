import "@nuxt/types";
import {AbstractLoadedModule} from "./internal";

declare module "@nuxt/types" {
    interface Context {
        $connectionId: string,
        $__store__: Context["store"],
        $store: {
            [moduleName: string]: AbstractLoadedModule
        },
        $schedule: <T>(cb: () => T) => T extends Promise<any> ? T : Promise<T>,
        $dispatch: (
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
        }>
    }
}

import "@nuxt/types";
import {NuxtOptions} from "@nuxt/types";

declare module "@nuxt/types" {
    interface NuxtOptions {
        exful?: {
            experimental?: {
                enableSSRExpressReqRes?: boolean
            }
        }
    }
}

//@ts-ignore just to silence the variable-is-unused error without ts-ignoring the import itself
type _Unused = [NuxtOptions];

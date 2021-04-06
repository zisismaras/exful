import {Plugin} from "@nuxt/types";
import {newConnection} from "~exful/stateTree";

const createConnection: Plugin = async function(context, inject) {
    const connectionId = await newConnection();
    context.beforeNuxtRender(({ nuxtState }) => {
        //pass existing ssr module states
        //@ts-ignore no $store type
        nuxtState.$serverState = Object.entries(context.$store).reduce(function(acc, [modName, mod]) {
            //@ts-ignore no $store type
            acc[modName] = mod.state;
            return acc;
        }, {} as {[key: string]: unknown});
        //pass the connectionId
        nuxtState.$connectionId = connectionId;
    });
    inject("connectionId", connectionId);
};

export default createConnection;

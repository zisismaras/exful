import {Plugin} from "@nuxt/types";
import {initializeContext} from "~exful/initializeContext";

//@ts-ignore
const {newConnection} = __non_webpack_require__("exful/dist/stateTree");

const init: Plugin = async function(context) {
    initializeContext(context);
    const connectionId: string = await newConnection();
    context.beforeNuxtRender(({ nuxtState }) => {
        //pass existing ssr module states
        nuxtState.$__exful = {};
        nuxtState.$__exful.serverState = Object.entries(context.$exful).reduce(function(acc, [modName, mod]) {
            acc[modName] = mod.state;
            return acc;
        }, {} as {[key: string]: unknown});
        //pass the connectionId
        nuxtState.$__exful.connectionId = connectionId;
    });
    //also add it to the context
    context.$__exful.inject("connectionId", connectionId);
};

export default init;

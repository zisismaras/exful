import {Plugin} from "@nuxt/types";
import {initializeContext} from "~exful/initializeContext";

const PING_INTERVAL = 5 * 60 * 1000;
let timer: unknown = null;

const ping: Plugin = function(context) {
    initializeContext(context);
    if (timer) return;
    timer = setInterval(async function() {
        await context.$axios.put(`/exful/ping/${context.nuxtState.$connectionId}`);
    }, PING_INTERVAL);
};

export default ping;

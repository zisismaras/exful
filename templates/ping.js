import {initializeContext} from "~exful/initializeContext";

const PING_INTERVAL = <%= options.pingInterval %> * 1000;
let timer = null;

/**
 * @type {import('@nuxt/types').Plugin}
 */
export default function(context) {
    initializeContext(context);
    if (timer) return;
    timer = setInterval(async function() {
        await context.$axios.put(`/exful/ping/${context.nuxtState.$__exful.connectionId}`);
    }, PING_INTERVAL);
};

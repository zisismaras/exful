import {Plugin} from "@nuxt/types";

const PING_INTERVAL = 5 * 60 * 1000;
let timer: unknown = null;

const ping: Plugin = function(context) {
    if (timer) return;
    timer = setInterval(async function() {
        await context.$axios.put(`/store/ping/${context.nuxtState.$connectionId}`);
    }, PING_INTERVAL);
};

export default ping;

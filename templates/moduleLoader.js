import Vue from "vue";
import Vuex from "vuex";

<%(function() {
    options.modules = options.discover();
})()%>
<% for (const mod of options.modules) { %>
    <% if (mod.state) { %>
        import State_<%= mod.name %> from "<%= mod.state %>";
    <% } %>
    <% if (mod.mutations) { %>
        import Mutations_<%= mod.name %> from "<%= mod.mutations %>";
    <% } %>
    <% if (mod.getters) { %>
        import Getters_<%= mod.name %> from "<%= mod.getters %>";
    <% } %>
    import {accessor as accessor_<%= mod.name %>} from "<%= mod.root %>";
<% } %>

Vue.use(Vuex);

/**
 * @type {import('@nuxt/types').Plugin}
 */
export default function({app}) {
    const store = new Vuex.Store({
        strict: process.env.NODE_ENV !== "production",
        devtools: process.env.NODE_ENV !== "production"
    });
    const wrapperStore = {};

    Object.defineProperty(app, "store", {
        get() {
            throw new Error("app.store is not available, use app.$store")
        }
    });

    Object.defineProperty(app.context, "store", {
        get() {
            throw new Error("context.store is not available, use context.$store")
        }
    });
    
    app.$__store__ = store;
    app.$store = wrapperStore;

    if (!app.context.$__store__) app.context.$__store__ = store;
    if (!app.context.$store) app.context.$store = wrapperStore;

    if (!Vue.__actualStore_installed__) {
        Vue.__actualStore_installed__ = true;
        Vue.use(() => {
            if (!Object.prototype.hasOwnProperty.call(Vue.prototype, "$__store__")) {
                Object.defineProperty(Vue.prototype, "$__store__", {
                    get () {
                        return this.$root.$options["$__store__"]
                    }
                });
            }
        });
    }

    if (!Vue.__wrapperStore_installed__) {
        Vue.__wrapperStore_installed__ = true;
        Vue.use(() => {
            if (!Object.prototype.hasOwnProperty.call(Vue.prototype, "$store")) {
                Object.defineProperty(Vue.prototype, "$store", {
                    get () {
                        return this.$root.$options["$store"]
                    },
                    //probably needed because vue might try to overwrite us?
                    set () {}
                });
            }
        });
    }
    <% for (const mod of options.modules) { %>
        store.registerModule("<%= mod.name %>", {
            namespaced: true,
            <% if (mod.state) { %>
            //on client we want to use the existing ssr state
            state: process.client ? app.context.nuxtState.$serverState["<%= mod.name %>"] : State_<%= mod.name %>,
            <% } %>
            <% if (mod.mutations) { %>
            mutations: Mutations_<%= mod.name %>,
            <% } %>
            <% if (mod.getters) { %>
            getters: Getters_<%= mod.name %>
            <% } %>
        });
        wrapperStore["<%= mod.name %>"] = accessor_<%= mod.name %>(app.context);
    <% } %>
}

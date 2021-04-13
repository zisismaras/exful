import Vue from "vue";
import Vuex from "vuex";
import {initializeContext} from "~exful/initializeContext";

<%(function() {
    options.modules = options.discover("paths");
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
export default function(context, inject) {
    initializeContext(context);
    const vuexStore = new Vuex.Store({
        strict: process.env.NODE_ENV !== "production",
        devtools: process.env.NODE_ENV !== "production"
    });
    context.$__exful.inject("vuexStore", vuexStore);
    
    const exful = {};
    inject("exful", exful);

    <% for (const mod of options.modules) { %>
        vuexStore.registerModule("<%= mod.name %>", {
            namespaced: true,
            <% if (mod.state) { %>
            //on client we want to use the existing ssr state
            state: process.client ? context.nuxtState.$__exful.serverState["<%= mod.name %>"] : State_<%= mod.name %>,
            <% } %>
            <% if (mod.mutations) { %>
            mutations: Mutations_<%= mod.name %>,
            <% } %>
            <% if (mod.getters) { %>
            getters: Getters_<%= mod.name %>
            <% } %>
        });
        exful["<%= mod.name %>"] = accessor_<%= mod.name %>(context);
    <% } %>
}

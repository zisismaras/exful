import ExpressRequest from "~express/request";
import ExpressResponse from "~express/response";
import {initializeContext} from "~exful/initializeContext";

const {logger} = __non_webpack_require__("exful/dist/logger");
const {startDispatchChain} = __non_webpack_require__("exful/dist/actionRunner");

<%(function() {
    options.modules = options.discover("paths");
    options.globalHooks = options.globalHooksDiscover("paths");
})()%>
<% for (const mod of options.modules) { %>
    <% if (mod.actions) { %>
        import Actions_<%= mod.name %> from "<%= mod.actions %>";
    <% } %>
    <% if (mod.state) { %>
        import State_<%= mod.name %> from "<%= mod.state %>";
    <% } %>
    <% if (mod.getters) { %>
        import Getters_<%= mod.name %> from "<%= mod.getters %>";
    <% } %>
    <% if (mod.mutations) { %>
        import Mutations_<%= mod.name %> from "<%= mod.mutations %>";
    <% } %>
    <% if (mod.hooks) { %>
        import Hooks_<%= mod.name %> from "<%= mod.hooks %>";
    <% } %>
<% } %>

const globalHooks = [];
<% for (const globalHookPath of options.globalHooks) { %>
    globalHooks.push(require("<%= globalHookPath %>").default)
<% } %>

const moduleTree = {
    <% for (const mod of options.modules) { %>
        "<%= mod.name %>": {
            <% if (mod.actions) { %>
                actions: Actions_<%= mod.name %>,
            <% } %>
            <% if (mod.state) { %>
                state: State_<%= mod.name %>,
            <% } %>
            <% if (mod.getters) { %>
                getters: Getters_<%= mod.name %>,
            <% } %>
            <% if (mod.mutations) { %>
                mutations: Mutations_<%= mod.name %>,
            <% } %>
            <% if (mod.hooks) { %>
                hooks: Hooks_<%= mod.name %>,
            <% } %>
        },
    <% } %>
};
function getDispatch(req, res) {
    return async function dispatch(connectionId, moduleName, actionName, payload) {
        try {
            const {initialModule, applyMutations} = await startDispatchChain({
                connectionId,
                initialModuleName: moduleName,
                moduleTree,
                globalHooks,
                req,
                res,
                isSSR: true
            });
            const actionResult = await initialModule.dispatch(actionName, payload);
            const mutations = await applyMutations();
    
            return {
                status: "ok",
                result: {
                    actionResult,
                    mutations
                }
            };
        } catch (e) {
            logger.error(e);
            return {
                status: "error"
            }
        }
    }
}

/**
 * @type {import('@nuxt/types').Plugin}
 */
export default function(context) {
    initializeContext(context);
    <% if (options.enableSSRExpressReqRes === true) { %>
        context.req.res = context.res;
        context.res.req = context.req;
        context.res.locals = Object.create(null);
        Reflect.setPrototypeOf(context.req, ExpressRequest);
        Reflect.setPrototypeOf(context.res, ExpressResponse);
    <% } %>
    context.$__exful.inject("dispatch", getDispatch(context.req, context.res));
}

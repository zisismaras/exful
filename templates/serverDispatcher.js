import ExpressRequest from "~express/request";
import ExpressResponse from "~express/response";
import {createActionContext, applyMutations} from "~exful/actionRunner";

<%(function() {
    options.modules = options.discover();
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
        },
    <% } %>
};
function getDispatch(req, res) {
    return async function dispatch(connectionId, moduleName, actionName, payload) {
        const {actionContext, commitTracker, currentStates} = await createActionContext({
            connectionId,
            moduleName,
            moduleTree,
            req,
            res,
            isSSR: true
        });
        const actionResult = await moduleTree[moduleName].actions[actionName](actionContext, payload);
        await applyMutations({
            connectionId,
            moduleTree,
            commitTracker,
            currentStates
        });

        return {
            actionResult,
            mutations: commitTracker
        };
    }
}

/**
 * @type {import('@nuxt/types').Plugin}
 */
export default function(context, inject) {
    <% if (options.enableSSRExpressReqRes === true) { %>
        context.req.res = context.res;
        context.res.req = context.req;
        context.res.locals = Object.create(null);
        Reflect.setPrototypeOf(context.req, ExpressRequest);
        Reflect.setPrototypeOf(context.res, ExpressResponse);
    <% } %>
    inject("dispatch", getDispatch(context.req, context.res));
}

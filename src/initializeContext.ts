import {Context} from "@nuxt/types";

export function initializeContext({app}: Context) {
    const exfulContext = {
        inject: function(property, value) {
            app.$__exful[property] = value;
            if (!app.context.$__exful[property]) app.context.$__exful[property] = value;
        }
    } as Context["$__exful"];
    if (!app.$__exful) {
        app.$__exful = exfulContext;
    }
    if (!app.context.$__exful) {
        app.context.$__exful = exfulContext;
    }
}

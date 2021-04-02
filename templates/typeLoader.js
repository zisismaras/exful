/*
  Auto-generated type definitions
*/

<%(function() {
    options.modules = options.discover("paths");
})()%>
<% for (const mod of options.modules) { %>
import {accessor as <%= mod.name %>} from "<%= mod.root %>";
<% } %>

declare module "vue/types/vue" {
    interface Vue {
        $store: {
            <% for (const mod of options.modules) { %>
            "<%= mod.name %>": ReturnType<typeof <%= mod.name %>>
            <% } %>
        };
    }
}

declare module "@nuxt/types" {
    interface Context {
        $store: {
            <% for (const mod of options.modules) { %>
            "<%= mod.name %>": ReturnType<typeof <%= mod.name %>>
            <% } %>
        };
    }

    interface NuxtAppOptions {
        $store: {
            <% for (const mod of options.modules) { %>
            "<%= mod.name %>": ReturnType<typeof <%= mod.name %>>
            <% } %>
        };
    }
}

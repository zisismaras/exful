/*
  Auto-generated type definitions.
  Don't edit manually.
  The type will be rebuilt every time a module is updated.
*/
// eslint-disable-next-line
import Vue from "vue";
// eslint-disable-next-line
import {Context, NuxtAppOptions, NuxtOptions} from "@nuxt/types";
import {PartialExfulOptions} from "exful/dist/types/extendedOptions";

<%(function() {
    options.modules = options.discover("paths");
})()%>
<% for (const mod of options.modules) { %>
import {accessor as <%= mod.name %>} from "<%= mod.root %>";
<% } %>

type Exful = {
    <% for (const mod of options.modules) { %>
    "<%= mod.name %>": ReturnType<typeof <%= mod.name %>>
    <% } %>
};

declare module "vue/types/vue" {
    interface Vue {
        $exful: Exful;
    }
}

declare module "@nuxt/types" {
    interface Context {
        $exful: Exful;
    }

    interface NuxtAppOptions {
        $exful: Exful;
    }

    interface NuxtOptions {
        exful?: PartialExfulOptions
    }
}

# Exful

Exful is a highly experimental all in one state manager, API layer and server framework.  
Currently it's only available for nuxt (version 2) since it relies on core nuxt functionality like the dynamic template system, SSR and built-in server.  

**Note** The project is of prototype quality at best and has not be tested in a production context. Do not use it for anything serious.

## How it works

Exful transforms the standard vuex store to a full stack framework.  
The canonical state is persisted on the server using an in-memory or redis store.  
Actions are run on the server and any mutations they generate are applied first to the server store. Then, the mutations are transfered to the client, keeping the two stores in sync.  

Since actions are run on the server, typical server side logic like database calls can be run in actions.  
Action invocations replace traditional API calls and mutations become the transmission format.  
State access, getters and action dispatch are available in pages and components like when using a standard vuex store.  
Everything works in both the SSR and client context.  
The nuxt builder tracks exful modules and automatically generates types and interfaces making everything fully type-safe.

- [Exful](#exful)
  - [How it works](#how-it-works)
  - [Installing](#installing)
    - [Registering the modules](#registering-the-modules)
    - [Using the CLI helper](#using-the-cli-helper)
    - [Directory structure](#directory-structure)
  - [Module anatomy](#module-anatomy)
    - [Module definition](#module-definition)
    - [State](#state)
    - [Mutations](#mutations)
    - [Actions](#actions)
    - [Getters](#getters)
    - [Hooks](#hooks)
    - [GlobalHooks](#globalhooks)
  - [Usage in pages and components](#usage-in-pages-and-components)


## Installing

```bash
npm install exful
```

### Registering the modules

Exful includes one runtime and one build module that must be included in nuxt config.

```typescript
// Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
buildModules: [
    // ...
    "exful/nuxt/build"
    // ...
]
```

```typescript
// Modules: https://go.nuxtjs.dev/config-modules
modules: [
    // ...
    "exful/nuxt/runtime"
    // ...
]
```

The modules accepts some optional configuration parameters. You can see what's available if you import nuxt's Config type.  

Finally run `npm run dev` and you should see some extra info about exful after nuxt's standards messages if everything was hooked up correctly.

![Install](./repo/install.png?raw=true)

### Using the CLI helper

A simple CLI helper is also included to create new exful modules. Use it to generate module skeletons and save some typing.

```bash
npx exc add myModule
```

It's recommended to run it at least once to create the directory structure.

### Directory structure

Exful modules live in an `exful` directory on the root of the project.  
Nuxt builder will also auto-generate an `exfulTypes.ts` file on the root of the project and regenerate it automatically every time a module changes.

![Directory](./repo/directory.png?raw=true)

## Module anatomy

### Module definition

Inside the definition file (`index.ts`) of each module we define the module's structure by adding the types of the state, getters, mutations and actions. We also give it a name.

```typescript
import {Module} from "exful";

export const {State, Getters, Mutations, Actions, Hooks, accessor} = Module<{
    state: {
        counter: number
    },
    getters: {
        counterPlusOne(): number,
        incrementedCounter(): (amount: number) => number
    },
    mutations: {
        setCounter(payload: number): void
    },
    actions: {
        updateCounter(payload: number): void
    }
}>("counterModule");
```

The `Module()` constructor will return type-safe initializers which we export and then import in their respective implementation files.  

**Note**: the `accessor` property must always be exported so exful can properly register the module.  

**Note2** Only put server logic in the action and hooks files. All other files must be universal.

### State

```typescript
import {State} from "./index";

export default State(() => ({
    counter: 0
}));

```

### Mutations

```typescript
import {Mutations} from "./index";

export default Mutations({
    setCounter(state, payload) {
        state.counter += payload;
    }
});
```

### Actions

```typescript
import {Actions} from "./index";

export default Actions({
    updateCounter(context, payload) {
        context.commit("setCounter", payload);
    }
});
```

### Getters

```typescript
import {Getters} from "./index";

export default Getters({
    counterPlusOne(state, _getters) {
        return state.counter + 1;
    },
    incrementedCounter: (state) => (amount) => {
        return state.counter + amount;
    }
});
```

### Hooks

Hooks can be used to implement authentication, validation, error reporting etc.  
There are available before/after/error hooks for every module action.  
The hook names are also type safe and are generated based on defined actions.  

```typescript
import {Hooks} from "./index";

export default Hooks({
    "after:all": function(ctx) {},
    "after:updateCounter": function(ctx) {},
    "before:all": function(ctx) {},
    "before:updateCounter": function(ctx) {},
    "error:all": function(ctx) {},
    "error:updateCounter": function(ctx) {}
});
```

### GlobalHooks

GlobalHooks can be defined in a file on the root exful directory.  
As the name implies they are global and run for every module.  
They can be used to implement store-wide functionality like logging. 

```typescript
import {GlobalHooks} from "exful";

export default GlobalHooks({
    before(ctx) {},
    after(ctx) {},
    error(ctx) {}
});
```

## Usage in pages and components

Exful can be used like a standard vuex store.  
The store can be accessed on `this.$exful`.  
In the SSR context (`asyncData` etc) the store can be accessed on `ctx.$exful`.  

```html
<template>
  <div>
    <h1>Counter: {{ counter }}</h1>
    <button @click="increment">
      Increment
    </button>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
    name: "IndexPage",
    computed: {
        counter() {
            return this.$exful.counterModule.state.counter;
        }
    },
    methods: {
        async increment() {
            await this.$exful.counterModule.dispatch("updateCounter", 1);
        }
    }
});
</script>
```

The whole API is again type-safe and every type is auto-generated by the nuxt builder.

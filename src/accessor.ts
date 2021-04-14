import {PreAccessorCreator, Accessor} from "./types/public";

export function getAccessor<Schema>(name: string): PreAccessorCreator<Schema> {
    return function accessor(context) {
        //transform the vuex getters
        //myModule/myGetter => myGetter
        const myGetters = {};
        for (const key of Object.keys(context.$__exful.vuexStore.getters)) {
            if (key.startsWith(`${name}/`)) {
                Object.defineProperty(myGetters, key.replace(`${name}/`, ""), {
                    get: function() {
                        return context.$__exful.vuexStore.getters[key];
                    }
                });
            }
        }
        const myAccessor = {
            state: context.$__exful.vuexStore.state[name],
            getters: myGetters,
            dispatch: async function(action: string, payload: unknown) {
                if (process.client) {
                    //api call
                    return context.$__exful.schedule(async function() {
                        const result = await context.$axios.post(`/exful/${name}/${action}`, {
                            connectionId: context.nuxtState.$__exful.connectionId,
                            payload: payload
                        });
                        //apply mutations on actual store
                        for (const commit of result.data.mutations) {
                            context.$__exful.vuexStore.commit(`${commit.moduleName}/${commit.mutation}`, commit.payload);
                        }
                        return result.data.actionResult;
                    });
                } else {
                    //serverDispatcher
                    const serverDispatched = await context.$__exful.dispatch(context.$__exful.connectionId, name, action, payload);
                    if (serverDispatched.status === "ok") {
                        //apply mutations on actual store
                        for (const commit of serverDispatched.result.mutations) {
                            context.$__exful.vuexStore.commit(`${commit.moduleName}/${commit.mutation}`, commit.payload);
                        }
                        return serverDispatched.result.actionResult;
                    } else {
                        context.error({statusCode: 500, message: "Internal server error"});
                    }
                }
            }
        };
    
        //if you commit mutations from the devtools the state is replaced
        //so the reference we have is now invalid.
        //With a getter we can always point to the current state object
        if (process.client) {
            Object.defineProperty(myAccessor, "state", {
                get: function() {
                    return context.$__exful.vuexStore.state[name];
                }
            });
        }
    
        return myAccessor as unknown as Accessor<Schema>;
    };
}

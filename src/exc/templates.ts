function stateTemplate() {
    return `
import {State} from "./index";

export default State(() => ({
    counter: 0
}));
`.trim() + "\n";
}

function mutationsTemplate() {
    return `
import {Mutations} from "./index";

export default Mutations({
    setCounter(state, payload) {
        state.counter += payload;
    }
});
`.trim() + "\n";
}

function actionsTemplate() {
    return `
import {Actions} from "./index";

export default Actions({
    updateCounter(context, payload) {
        context.commit("setCounter", payload);
    }
});    
`.trim() + "\n";
}

function gettersTemplate() {
    return `
import {Getters} from "./index";

export default Getters({
    counterPlusOne(state, _getters) {
        return state.counter + 1;
    },
    incrementedCounter: (state) => (amount) => {
        return state.counter + amount;
    }
});  
`.trim() + "\n";
}

function indexTemplate(name: string) {
    return `
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
}>("${name}");
`.trim() + "\n";
}

module.exports = {
    indexTemplate,
    stateTemplate,
    mutationsTemplate,
    actionsTemplate,
    gettersTemplate
};

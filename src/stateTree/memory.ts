import {v4 as uuid} from "uuid";
import {ExfulOptions} from "../types/extendedOptions";

type MemoryState = {
    [connectionId: string]: {
        [moduleName: string]: Record<string, unknown>
    }
}

let memoryState: MemoryState;

export function initialize(options: ExfulOptions["backend"]) {
    if (memoryState) {
        throw new Error("[exful] Backend already initialized");
    }
    if (options.type === "memory") {
        memoryState = {};
    }
}

export function newConnection() {
    const connectionId = uuid();
    memoryState[connectionId] = {};
    return Promise.resolve(connectionId);
}

export function renewConnection(connectionId: string, _moduleNames: string[]) {
    if (!memoryState[connectionId]) {
        throw new Error("Unknown connection");
    }
    return Promise.resolve();
}

export function getState(
    connectionId: string,
    moduleName: string,
    initialState: () => Record<string, unknown>
) {
    if (!memoryState[connectionId]) {
        throw new Error("Unknown connection");
    }
    let state = memoryState[connectionId][moduleName];
    if (!state) {
        state = initialState();
        memoryState[connectionId][moduleName] = state;
    }

    return Promise.resolve(state);
}

export function updateState(
    connectionId: string,
    newStates: {[key: string]: Record<string, unknown>}
) {
    if (!memoryState[connectionId]) {
        throw new Error("Unknown connection");
    }
    for (const [moduleName, newState] of Object.entries(newStates)) {
        memoryState[connectionId][moduleName] = newState;
    }
    return Promise.resolve();
}


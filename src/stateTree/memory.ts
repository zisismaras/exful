import {v4 as uuid} from "uuid";
import NodeCache from "node-cache";
import {ExfulOptions} from "../types/extendedOptions";

let memoryState: NodeCache;
let CONNECTION_TTL: number;

export function initialize(options: ExfulOptions["backend"]) {
    if (memoryState) {
        throw new Error("[exful] Backend already initialized");
    }
    if (options.type === "memory") {
        memoryState = new NodeCache({
            checkperiod: options.checkExpiredInterval
        });
        CONNECTION_TTL = options.connectionTTL;
    }
}

export function newConnection() {
    const connectionId = uuid();
    memoryState.set(`exful#connection#${connectionId}`, Date.now(), CONNECTION_TTL);
    return Promise.resolve(connectionId);
}

export function renewConnection(connectionId: string, moduleNames: string[]) {
    if (!memoryState.get(`exful#connection#${connectionId}`)) {
        throw new Error("Unknown connection");
    }
    memoryState.ttl(`exful#connection#${connectionId}`, CONNECTION_TTL);
    for (const moduleName of moduleNames) {
        memoryState.ttl(`exful#state#${connectionId}#${moduleName}`, CONNECTION_TTL);
    }
    return Promise.resolve();
}

export function getState(
    connectionId: string,
    moduleName: string,
    initialState: () => Record<string, unknown>
) {
    if (!memoryState.get(`exful#connection#${connectionId}`)) {
        throw new Error("Unknown connection");
    }
    let state = memoryState.get<Record<string, unknown>>(`exful#state#${connectionId}#${moduleName}`);
    if (!state) {
        state = initialState();
        memoryState.set(`exful#state#${connectionId}#${moduleName}`, state, CONNECTION_TTL);
    }

    return Promise.resolve(state);
}

export function updateState(
    connectionId: string,
    newStates: {[key: string]: Record<string, unknown>}
) {
    if (!memoryState.get(`exful#connection#${connectionId}`)) {
        throw new Error("Unknown connection");
    }
    for (const [moduleName, newState] of Object.entries(newStates)) {
        memoryState.set(`exful#state#${connectionId}#${moduleName}`, newState, CONNECTION_TTL);
    }
    return Promise.resolve();
}

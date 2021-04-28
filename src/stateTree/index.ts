import * as redis from "./redis";
import * as memory from "./memory";
import {ExfulOptions} from "../types/extendedOptions";

declare module "./" {
    function newConnection(): Promise<string>;
    function renewConnection(connectionId: string, moduleNames: string[]): Promise<void>;
    function getState(
        connectionId: string,
        moduleName: string,
        initialState: () => Record<string, unknown>
    ): Promise<Record<string, unknown>>;
    function updateState(
        connectionId: string,
        newStates: {
            [key: string]: Record<string, unknown>;
        }
    ): Promise<void>;
}

export function initializeStateTree(options: ExfulOptions["backend"]) {
    if (options.type === "memory") {
        memory.initialize(options);
        module.exports = {
            newConnection: memory.newConnection,
            renewConnection: memory.renewConnection,
            getState: memory.getState,
            updateState: memory.updateState,
            initializeStateTree: () => undefined
        };
    } else if (options.type === "redis") {
        redis.initialize(options);
        module.exports = {
            newConnection: redis.newConnection,
            renewConnection: redis.renewConnection,
            getState: redis.getState,
            updateState: redis.updateState,
            initializeStateTree: () => undefined
        };
    } else {
        throw new Error("[exful] Invalid backend option");
    }
}

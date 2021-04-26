import {v4 as uuid} from "uuid";
import Redis from "ioredis";
import {ExfulOptions} from "../types/extendedOptions";

let redisClient: Redis.Redis;
let CONNECTION_TTL: number;

export function initialize(options: ExfulOptions["backend"]) {
    if (redisClient) {
        throw new Error("[exful] Backend already initialized");
    }
    if (options.type === "redis") {
        redisClient = new Redis(options.options);
        CONNECTION_TTL = options.connectionTTL;
    }
}

export async function newConnection() {
    const connectionId = uuid();
    await redisClient.setex(
        `exful#connection#${connectionId}`,
        CONNECTION_TTL,
        Date.now()
    );
    return connectionId;
}

export async function renewConnection(connectionId: string, moduleNames: string[]) {
    if (!await redisClient.exists(`exful#connection#${connectionId}`)) {
        throw new Error("Unknown connection");
    }
    const multi = redisClient.multi();
    multi.expire(`exful#connection#${connectionId}`, CONNECTION_TTL);
    for (const moduleName of moduleNames) {
        multi.expire(`exful#state#${connectionId}#${moduleName}`, CONNECTION_TTL);
    }
    await multi.exec();
}

export async function updateState(
    connectionId: string,
    newStates: {[key: string]: Record<string, unknown>}
) {
    if (!await redisClient.exists(`exful#connection#${connectionId}`)) {
        throw new Error("Unknown connection");
    }
    const multi = redisClient.multi();
    for (const [moduleName, newState] of Object.entries(newStates)) {
        multi.setex(
            `exful#state#${connectionId}#${moduleName}`,
            CONNECTION_TTL,
            JSON.stringify(newState)
        );
    }
    await multi.exec();
}

export async function getState(
    connectionId: string,
    moduleName: string,
    initialState: () => Record<string, unknown>
) {
    if (!await redisClient.exists(`exful#connection#${connectionId}`)) {
        throw new Error("Unknown connection");
    }
    let state = await redisClient.get(`exful#state#${connectionId}#${moduleName}`);
    if (!state) {
        //@ts-ignore
        state = initialState();
        await redisClient.setex(
            `exful#state#${connectionId}#${moduleName}`,
            CONNECTION_TTL,
            JSON.stringify(state)
        );
    } else {
        state = JSON.parse(state);
    }

    return state as unknown as Record<string, unknown>;
}

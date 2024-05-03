"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOne = exports.unRelate = exports.relate = exports.queryParser = exports.insert = exports.getOne = exports.getAll = exports.deleteOne = exports.aggregate = exports.writeStore = exports.storeToCollection = exports.bootstrap = void 0;
const store_1 = require("./src/store");
const dirs_1 = require("./src/dirs");
const promises_1 = require("./src/promises");
const methods_1 = require("./src/methods");
// parse array of lines to object
function parseArrayToObject(arr) {
    const obj = {};
    arr.forEach((item) => {
        const [key, value] = (0, methods_1.splitField)(item, ": "); // need to fix!
        obj[key] = value.slice(0, 1) === "!" ? value.slice(1, value.length) : value;
    });
    return obj;
}
/**
 * Parses fields (single, array, object)
 **/
function parseObjectFields(obj, model) {
    const keys = Object.keys(obj);
    for (let x = 0; x < keys.length; x++) {
        const key = keys[x];
        const field = model[key];
        if (!field) {
            continue;
        }
        const fieldResult = (0, methods_1.parseField)(field);
        if (fieldResult.type !== "single") {
            obj[key] = JSON.parse(obj[key]);
        }
    }
    return obj;
}
/**
 * Read model (ORM), return IObject
 **/
async function readModel(name) {
    const modelProxy = await (0, promises_1.read)(`${dirs_1.ORM_DIR}/${name}.pxx`, "utf8");
    return parseArrayToObject(modelProxy
        .split("\n")
        .filter((x, i) => i > 0)
        .map((line) => line.trim()));
}
async function readCollection(name) {
    try {
        const model = await readModel(name);
        const dataProxy = await (0, promises_1.read)(`${dirs_1.DATA_DIR}/${name}.dta`, "utf8");
        const qwerty = dataProxy.split("----------").map((item) => {
            return item
                .split("\n")
                .filter((line) => line !== "")
                .map((line) => line.trim());
        });
        return qwerty.map((x) => parseObjectFields(parseArrayToObject(x), model));
    }
    catch (error) {
        return [];
    }
}
async function bootstrap() {
    // model names
    const modelFiles = await (0, promises_1.readdir)(dirs_1.ORM_DIR);
    const modelNames = modelFiles.map((x) => x.replace(/\.[^/.]+$/, ""));
    const models = {};
    const collections = {};
    const indexes = {};
    const maxIds = {};
    // read model files, store to cache
    for (let x = 0; x < modelNames.length; x++) {
        const name = modelNames[x];
        // ORM:
        const model = await readModel(name);
        models[name] = model;
        // collections:
        const collection = await readCollection(name);
        collections[name] = collection;
        // indexes:
        const collectionIndexes = {};
        for (let y = 0; y < collection.length; y++) {
            const item = collection[y];
            collectionIndexes[item.id] = y;
        }
        indexes[name] = collectionIndexes;
        // max ids:
        const collectionMaxId = collection.length
            ? collection.map((item) => item.id).reduce((a, b) => (a > b ? a : b))
            : 0;
        maxIds[name] = collectionMaxId;
    }
    store_1.store.set("models", models);
    store_1.store.set("collections", collections);
    store_1.store.set("maxIds", maxIds);
    store_1.store.set("indexes", indexes);
}
exports.bootstrap = bootstrap;
// save data to disk
async function storeToCollection(name) {
    try {
        const model = store_1.store.get('models')[name];
        const keys = Object.keys(model);
        const collection = store_1.store.get("collections")[name];
        const data = collection
            .map((item) => {
            for (let x = 0; x < keys.length; x++) {
                const key = keys[x];
                const field = model[key];
                if (!field) {
                    continue;
                }
                const fieldResult = (0, methods_1.parseField)(field);
                if (fieldResult.type !== "single") {
                    item[key] = JSON.stringify(item[key]);
                }
            }
            return Object.keys({ id: item.id, ...item })
                .map((itemKey) => {
                return `${itemKey}: ${item[itemKey]}`;
            })
                .join("\n");
        })
            .join("\n----------\n");
        await (0, promises_1.write)(`${dirs_1.DATA_DIR}/${name}.dta`, data);
    }
    catch (error) {
        console.log(error);
    }
}
exports.storeToCollection = storeToCollection;
async function writeStore() {
    try {
        const collections = store_1.store.get("collections");
        const keys = Object.keys(collections);
        for (let x = 0; x < keys.length; x++) {
            const key = keys[x];
            if (!collections[key].length) {
                continue;
            }
            await storeToCollection(key);
            console.log(`Collection "${key}" is saved...`);
        }
    }
    catch (error) {
        console.log(error);
    }
}
exports.writeStore = writeStore;
var queries_1 = require("./src/queries");
Object.defineProperty(exports, "aggregate", { enumerable: true, get: function () { return queries_1.aggregate; } });
Object.defineProperty(exports, "deleteOne", { enumerable: true, get: function () { return queries_1.deleteOne; } });
Object.defineProperty(exports, "getAll", { enumerable: true, get: function () { return queries_1.getAll; } });
Object.defineProperty(exports, "getOne", { enumerable: true, get: function () { return queries_1.getOne; } });
Object.defineProperty(exports, "insert", { enumerable: true, get: function () { return queries_1.insert; } });
Object.defineProperty(exports, "queryParser", { enumerable: true, get: function () { return queries_1.queryParser; } });
Object.defineProperty(exports, "relate", { enumerable: true, get: function () { return queries_1.relate; } });
Object.defineProperty(exports, "unRelate", { enumerable: true, get: function () { return queries_1.unRelate; } });
Object.defineProperty(exports, "updateOne", { enumerable: true, get: function () { return queries_1.updateOne; } });

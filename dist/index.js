"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOne = exports.unRelate = exports.relate = exports.queryParser = exports.insert = exports.getOne = exports.getAll = exports.deleteOne = exports.checkModelExists = exports.checkCollectionExists = exports.aggregate = exports.IJoin = exports.store = exports.writeStore = exports.storeToCollection = exports.bootstrap = exports.clearCollections = exports.clearOneCollection = exports.updateCollectionsAfterBuild = void 0;
const store_1 = require("./src/store");
Object.defineProperty(exports, "store", { enumerable: true, get: function () { return store_1.store; } });
const dirs_1 = require("./src/dirs");
const promises_1 = require("./src/promises");
const methods_1 = require("./src/methods");
const { dbconfig } = require(`${process.cwd()}/dbconfig`);
const { itemSeparator, magicKey } = dbconfig;
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
        if (!fieldResult) {
            continue;
        }
        if (fieldResult.type === "array" || fieldResult.type === "object") {
            obj[key] = JSON.parse(obj[key]);
        }
    }
    return obj;
}
/**
 * Read model (ORM), return IObject
 **/
async function readModel(name) {
    const modelProxy = await (0, promises_1.read)(`${dirs_1.MODELS_DIR}/${name}.mod`, "utf8");
    return parseArrayToObject(modelProxy
        .split("\n")
        .filter((x, i) => i > 0)
        .map((line) => line.trim()));
}
// read collection from db
async function readCollection(name, model) {
    try {
        const dataProxy = await (0, promises_1.read)(`${dirs_1.DATA_DIR}/${name}.dta`, "utf8");
        const qwerty = dataProxy.split(itemSeparator).map((item) => {
            return item
                .replaceAll(magicKey, itemSeparator) // ??????????????????????
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line !== "");
        });
        return qwerty.map((x) => {
            if (model) {
                return parseObjectFields(parseArrayToObject(x), model);
            }
            else {
                return parseArrayToObject(x);
            }
        });
    }
    catch (error) {
        return [];
    }
}
// update collection after build new models
async function updateCollectionsAfterBuild(names) {
    try {
        const collections = store_1.store.get("collections");
        const models = store_1.store.get("models");
        const maxIds = store_1.store.get("maxIds");
        const indexes = store_1.store.get("indexes");
        for (let x = 0; x < names.length; x++) {
            const name = names[x];
            // ORM:
            const model = await readModel(name);
            models[name] = model;
            // collections:
            collections[name] = [];
            // indexes:
            const collectionIndexes = {};
            indexes[name] = collectionIndexes;
            // max ids
            maxIds[name] = 0;
        }
        store_1.store.set("collections", collections);
    }
    catch (error) {
        console.log(error);
    }
}
exports.updateCollectionsAfterBuild = updateCollectionsAfterBuild;
// clear one collection (danger!)
function clearOneCollection(name) {
    try {
        let models = store_1.store.get("models");
        let collections = store_1.store.get("collections");
        let maxIds = store_1.store.get("maxIds");
        let indexes = store_1.store.get("indexes");
        models = (0, methods_1.removeField)(models, name);
        collections = (0, methods_1.removeField)(collections, name);
        maxIds = (0, methods_1.removeField)(maxIds, name);
        indexes = (0, methods_1.removeField)(indexes, name);
        store_1.store.set("models", {});
        store_1.store.set("collections", {});
        store_1.store.set("maxIds", {});
        store_1.store.set("indexes", {});
    }
    catch (error) {
        console.log(error);
    }
}
exports.clearOneCollection = clearOneCollection;
// clear all collections (danger!)
function clearCollections() {
    try {
        let collections = store_1.store.get("collections");
        const keys = Object.keys(collections);
        for (let x = 0; x < keys.length; x++) {
            const key = keys[x];
            collections[key] = [];
        }
        store_1.store.set("models", {});
        store_1.store.set("collections", collections);
        store_1.store.set("maxIds", {});
        store_1.store.set("indexes", {});
    }
    catch (error) {
        console.log(error);
    }
}
exports.clearCollections = clearCollections;
// check if directory exists
async function checkFolderExists(dir) {
    try {
        await (0, promises_1.access)(dir);
        return true;
    }
    catch (error) {
        return false;
    }
}
// create directory if not exist
async function mkDirNotExists(arg) {
    try {
        const exists = await checkFolderExists(arg);
        if (!exists) {
            await (0, promises_1.mkdir)(arg);
        }
    }
    catch (error) {
        console.log(error);
    }
}
async function bootstrap() {
    // create directories if not exist
    await mkDirNotExists(dirs_1.MODELS_DIR);
    await mkDirNotExists(dirs_1.QUERIES_DIR);
    await mkDirNotExists(dirs_1.DATA_DIR);
    // model names
    const modelFiles = await (0, promises_1.readdir)(dirs_1.MODELS_DIR);
    const modelNames = modelFiles.map((x) => x.replace(/\.[^/.]+$/, ""));
    // Relational collections
    const dataFiles = await (0, promises_1.readdir)(dirs_1.DATA_DIR);
    const relNames = dataFiles
        .map((x) => x.replace(/\.[^/.]+$/, ""))
        .filter((x) => !modelNames.includes(x));
    const models = {};
    const collections = {};
    const indexes = {};
    const maxIds = {};
    for (let x = 0; x < relNames.length; x++) {
        const rname = relNames[x];
        // collections:
        const collection = await readCollection(rname);
        collections[rname] = collection;
        // indexes:
        const collectionIndexes = {};
        for (let y = 0; y < collection.length; y++) {
            const item = collection[y];
            collectionIndexes[item.id] = y;
        }
        indexes[rname] = collectionIndexes;
        // max ids:
        const collectionMaxId = collection.length
            ? collection.map((item) => item.id).reduce((a, b) => (a > b ? a : b))
            : 0;
        maxIds[rname] = collectionMaxId;
    }
    // read model files, store to cache
    for (let x = 0; x < modelNames.length; x++) {
        const name = modelNames[x];
        // ORM:
        const model = await readModel(name);
        models[name] = model;
        // collections:
        const collection = await readCollection(name, model);
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
// Save data to disk
async function storeToCollection(name) {
    try {
        const collection = store_1.store.get("collections")[name];
        const model = store_1.store.get("models")[name];
        if (!collection || !collection?.length) {
            return;
        }
        const data = collection
            .map((obj) => {
            let objProxy = { ...obj };
            if (model) {
                for (let x = 0; x < Object.keys(model).length; x++) {
                    const key = Object.keys(model)[x];
                    const field = model[key]; // +++
                    if (!field) {
                        continue;
                    }
                    const fieldResult = (0, methods_1.parseField)(field);
                    if (!fieldResult) {
                        continue;
                    }
                    if (fieldResult.type === "array" || fieldResult.type === "object") {
                        objProxy[key] = JSON.stringify(objProxy[key]);
                    }
                    if (fieldResult.type === "relation") {
                        const relation = (0, methods_1.processRelation)(field);
                        if (!relation) {
                            continue;
                        }
                        const operator = relation.operator;
                        const level = relation.level;
                        if (operator === "<>" ||
                            (operator === "<>>" && level === "recipient")) {
                            continue;
                        }
                        objProxy = (0, methods_1.removeField)(objProxy, key);
                    }
                }
            }
            return Object.keys({ id: objProxy.id, ...objProxy })
                .map((objKey) => {
                let itemRow = `${objKey}: ${objProxy[objKey]}`;
                // convert separator
                if (model) {
                    itemRow = itemRow.replaceAll(itemSeparator, magicKey);
                }
                return itemRow;
            })
                .join("\n");
        })
            .join(`\n${itemSeparator}\n`);
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
                // if the collection is empty the data will be deleted
                try {
                    await (0, promises_1.unlink)(`${dirs_1.DATA_DIR}/${key}.dta`);
                }
                catch (error) {
                    console.log(`No '${key}' collection`);
                }
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
var types_1 = require("./src/types");
Object.defineProperty(exports, "IJoin", { enumerable: true, get: function () { return types_1.IJoin; } });
var queries_1 = require("./src/queries");
Object.defineProperty(exports, "aggregate", { enumerable: true, get: function () { return queries_1.aggregate; } });
Object.defineProperty(exports, "checkCollectionExists", { enumerable: true, get: function () { return queries_1.checkCollectionExists; } });
Object.defineProperty(exports, "checkModelExists", { enumerable: true, get: function () { return queries_1.checkModelExists; } });
Object.defineProperty(exports, "deleteOne", { enumerable: true, get: function () { return queries_1.deleteOne; } });
Object.defineProperty(exports, "getAll", { enumerable: true, get: function () { return queries_1.getAll; } });
Object.defineProperty(exports, "getOne", { enumerable: true, get: function () { return queries_1.getOne; } });
Object.defineProperty(exports, "insert", { enumerable: true, get: function () { return queries_1.insert; } });
Object.defineProperty(exports, "queryParser", { enumerable: true, get: function () { return queries_1.queryParser; } });
Object.defineProperty(exports, "relate", { enumerable: true, get: function () { return queries_1.relate; } });
Object.defineProperty(exports, "unRelate", { enumerable: true, get: function () { return queries_1.unRelate; } });
Object.defineProperty(exports, "updateOne", { enumerable: true, get: function () { return queries_1.updateOne; } });

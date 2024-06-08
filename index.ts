import { store } from "./src/store";
import { access, mkdir, read, readdir, unlink, write } from "promiseman";
import { IObject, INumObject } from "./src/types";
import {
  parseField,
  processRelation,
  removeField,
  splitField,
} from "./src/methods";

interface IConfig {
  "MODELS_DIR": string;
  "DATA_DIR": string;
  "QUERIES_DIR": string;
  "ITEM_SEPARATOR": string;
  "JOINS": boolean;
  "MAGIC_KEY": string;
}

const DEFAULT_CONFIG: IConfig = {
  "MODELS_DIR": "models",
  "DATA_DIR": "db",
  "QUERIES_DIR": "queries",
  "ITEM_SEPARATOR": "----------",
  "JOINS": true,
  "MAGIC_KEY": "12345"
};

// parse array of lines to object
function parseArrayToObject(arr: string[]): IObject {
  const obj: IObject = {};
  arr.forEach((item) => {
    const [key, value] = splitField(item, ": "); // need to fix!
    obj[key] = value.slice(0, 1) === "!" ? value.slice(1, value.length) : value;
  });
  return obj;
}

/**
 * Parses fields (single, array, object)
 **/
function parseObjectFields(obj: IObject, model: IObject) {
  const keys = Object.keys(obj);
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    const field = model[key];
    if (!field) {
      continue;
    }
    const fieldResult = parseField(field);
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
async function readModel(name: string): Promise<IObject> {
  const dbconfig = store.get("dbconfig");
  const MODELS_DIR = dbconfig.MODELS_DIR;
  const modelProxy = await read(`${MODELS_DIR}/${name}.mod`, "utf8");
  return parseArrayToObject(
    modelProxy
      .split("\n")
      .filter((x, i) => i > 0)
      .map((line) => line.trim()),
  );
}

// read collection from db
async function readCollection(
  name: string,
  model?: IObject,
): Promise<IObject[]> {
  try {
    const dbconfig = store.get("dbconfig");
    const DATA_DIR = dbconfig.DATA_DIR;
    const MAGIC_KEY = dbconfig.MAGIC_KEY;
    const ITEM_SEPARATOR= dbconfig.ITEM_SEPARATOR;
    const dataProxy = await read(`${DATA_DIR}/${name}.dta`, "utf8");
    const qwerty = dataProxy.split(ITEM_SEPARATOR).map((item) => {
      return item
        .replaceAll(MAGIC_KEY, ITEM_SEPARATOR) // ??????????????????????
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    });
    return qwerty.map((x) => {
      if (model) {
        return parseObjectFields(parseArrayToObject(x), model);
      } else {
        return parseArrayToObject(x);
      }
    });
  } catch (error) {
    return [];
  }
}

// update collection after build new models
export async function updateCollectionsAfterBuild(names: string[]): Promise<void> {
  try {
    const collections = store.get("collections");
    const models = store.get("models");
    const maxIds = store.get("maxIds");
    const indexes = store.get("indexes");

    for (let x = 0; x < names.length; x++) {
      const name = names[x];
      // ORM:
      const model = await readModel(name);
      models[name] = model;
      // collections:
      collections[name] = [];
      // indexes:
      const collectionIndexes: INumObject = {};
      indexes[name] = collectionIndexes;
      // max ids
      maxIds[name] = 0;
    }
    store.set("collections", collections);
  } catch (error) {
    console.log(error);
  }
}

// clear one collection (danger!)
export function clearOneCollection(name: string) {
  try {
    let models = store.get("models");
    let collections = store.get("collections");
    let maxIds = store.get("maxIds");
    let indexes = store.get("indexes");
    models = removeField(models, name);
    collections = removeField(collections, name);
    maxIds = removeField(maxIds, name);
    indexes = removeField(indexes, name);
    store.set("models", {});
    store.set("collections", {});
    store.set("maxIds", {});
    store.set("indexes", {});
  } catch (error) {
    console.log(error);
  }
}

// clear all collections (danger!)
export function clearCollections() {
  try {
    let collections = store.get("collections");
    const keys = Object.keys(collections);
    for (let x = 0; x < keys.length; x++) {
      const key = keys[x];
      collections[key] = [];
    }
    store.set("models", {});
    store.set("collections", collections);
    store.set("maxIds", {});
    store.set("indexes", {});
  } catch (error) {
    console.log(error);
  }
}

// check if directory exists
async function checkFolderExists(dir: string): Promise<boolean> {
  try {
    await access(dir);
    return true;
  } catch (error) {
    return false;
  }
}

// create directory if not exist
async function mkDirNotExists(arg: string): Promise<void> {
  try {
    const exists = await checkFolderExists(arg);
    if (!exists) {
      await mkdir(arg);
    }
  } catch (error) {
    console.log(error);
  }
}

export async function bootstrap() {
  let dbconfig;
  try {
    const rawConfig = await read(`${process.cwd()}/dbconfig.json`, "utf8");
    dbconfig = rawConfig ? JSON.parse(rawConfig) : DEFAULT_CONFIG;
  } catch (error) {
    console.log("No config.json found, use defaults...");
    dbconfig = DEFAULT_CONFIG;
  }
  store.set("dbconfig", dbconfig);
  const { MODELS_DIR, QUERIES_DIR, DATA_DIR } = dbconfig;
  // create directories if not exist
  await mkDirNotExists(MODELS_DIR);
  await mkDirNotExists(QUERIES_DIR);
  await mkDirNotExists(DATA_DIR);

  // model names
  const modelFiles = await readdir(MODELS_DIR);
  const modelNames = modelFiles.map((x) => x.replace(/\.[^/.]+$/, ""));

  // Relational collections
  const dataFiles = await readdir(DATA_DIR);
  const relNames = dataFiles
    .map((x) => x.replace(/\.[^/.]+$/, ""))
    .filter((x) => !modelNames.includes(x));

  const models: { [key: string]: IObject } = {};
  const collections: { [key: string]: IObject[] } = {};
  const indexes: { [key: string]: INumObject } = {};
  const maxIds: INumObject = {};

  for (let x = 0; x < relNames.length; x++) {
    const rname = relNames[x];
    // collections:
    const collection = await readCollection(rname);
    collections[rname] = collection;
    // indexes:
    const collectionIndexes: INumObject = {};
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
    const collectionIndexes: INumObject = {};
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
  store.set("models", models);
  store.set("collections", collections);
  store.set("maxIds", maxIds);
  store.set("indexes", indexes);
}

// Save data to disk
export async function storeToCollection(name: string): Promise<void> {
  try {
    const dbconfig = store.get("dbconfig");
    const DATA_DIR = dbconfig.DATA_DIR;
    const MAGIC_KEY = dbconfig.MAGIC_KEY;
    const ITEM_SEPARATOR= dbconfig.ITEM_SEPARATOR;
    const collection = store.get("collections")[name];
    const model: IObject = store.get("models")[name];
    if (!collection || !collection?.length) {
      return;
    }
    const data = collection
      .map((obj: IObject) => {
        let objProxy = { ...obj };
        if (model) {
          for (let x = 0; x < Object.keys(model).length; x++) {
            const key = Object.keys(model)[x];
            const field = model[key]; // +++
            if (!field) {
              continue;
            }
            const fieldResult = parseField(field);
            if (!fieldResult) {
              continue;
            }
            if (fieldResult.type === "array" || fieldResult.type === "object") {
              objProxy[key] = JSON.stringify(objProxy[key]);
            }
            if (fieldResult.type === "relation") {
              const relation = processRelation(field);
              if (!relation) {
                continue;
              }
              const operator = relation.operator;
              const level = relation.level;
              if (
                operator === "<>" ||
                (operator === "<>>" && level === "recipient")
              ) {
                continue;
              }
              objProxy = removeField(objProxy, key);
            }
          }
        }
        return Object.keys({ id: objProxy.id, ...objProxy })
          .map((objKey) => {
            let itemRow = `${objKey}: ${objProxy[objKey]}`
            // convert separator
            if (model) {
              itemRow = itemRow.replaceAll(ITEM_SEPARATOR, MAGIC_KEY);
            }
            return itemRow;
          })
          .join("\n");
      })
      .join(`\n${ITEM_SEPARATOR}\n`);
    await write(`${DATA_DIR}/${name}.dta`, data);
  } catch (error) {
    console.log(error);
  }
}

export async function writeStore() {
  try {
    const dbconfig = store.get("dbconfig");
    const DATA_DIR = dbconfig.DATA_DIR;
    const collections = store.get("collections") as IObject;
    const keys = Object.keys(collections);
    for (let x = 0; x < keys.length; x++) {
      const key = keys[x];
      if (!collections[key].length) {
        // if the collection is empty the data will be deleted
        try {
          await unlink(`${DATA_DIR}/${key}.dta`);
        } catch (error) {
          console.log(`No '${key}' collection`);
        }
        continue;
      }
      await storeToCollection(key);
      console.log(`Collection "${key}" is saved...`);
    }
  } catch (error) {
    console.log(error);
  }
}

export { store };
export { IAggr, ICollection, IJoin, INumObject, IObject, IQuery, IRelation, TOperator } from './src/types';
export { aggregate, checkCollectionExists, checkModelExists, deleteOne, getAll, getOne, insert, queryParser, relate, unRelate, updateOne } from './src/queries'
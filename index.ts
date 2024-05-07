import { store } from "./src/store";
import { DATA_DIR, ORM_DIR } from "./src/dirs";
import { read, readdir, write } from "./src/promises";
import { IObject, INumObject } from "./src/types";
import { processField, processRelation, removeField, splitField } from "./src/methods";

// parse array of lines to object
function arrayToObject(arr: string[]): IObject {
  const obj: IObject = {};
  arr.forEach((item) => {
    const [key, value] = splitField(item, ": "); // need to fix!
    obj[key] = value.slice(0, 1) === "!" ? value.slice(1, value.length) : value;
  });
  return obj;
}

// JSON.parse object fields
function parseObjectFields(obj: IObject, model: IObject) {
  const keys = Object.keys(obj);
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    const field = model[key];
    if (!field) {
      continue;
    }
    const fieldResult = processField(field);
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
  const modelProxy = await read(`${ORM_DIR}/${name}.pxx`, "utf8");
  return arrayToObject(
    modelProxy
      .split("\n")
      .filter((x, i) => i > 0)
      .map((line) => line.trim()),
  );
}

async function readCollection(
  name: string,
  model?: IObject,
): Promise<IObject[]> {
  try {
    const dataProxy = await read(`${DATA_DIR}/${name}.dta`, "utf8");
    const qwerty = dataProxy.split("----------").map((item) => {
      return item
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    });
    return qwerty.map((x) => {
      if (model) {
        return parseObjectFields(arrayToObject(x), model);
      } else {
        return arrayToObject(x);
      }
    });
  } catch (error) {
    return [];
  }
}

export async function bootstrap() {
  // model names
  const modelFiles = await readdir(ORM_DIR);
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
    const collection = store.get("collections")[name];
    const model: IObject = store.get("models")[name];
    const data = collection
      .map((item: IObject) => {
        if (model) {
          for (let x = 0; x < Object.keys(model).length; x++) {
            const key = Object.keys(model)[x];
            const field = model[key];
            if (!field) {
              continue;
            }
            const fieldResult = processField(field);
            if (!fieldResult) {
              continue;
            }

            if (fieldResult.type === "array" || fieldResult.type === "object") {
              item[key] = JSON.stringify(item[key]);
            }
            if (fieldResult.type === "relation") {
              //
              const relation = processRelation(field);
              if(!relation) {
                continue;
              }
              const operator = relation.operator;
              const level = relation.level;
              if(
                (operator === "<>") ||
                (operator === "<>>" && level === "recipient")
              ) {
                continue;
              }
              item = removeField(item, key);
            }
          }
        }
        return Object.keys({ id: item.id, ...item })
          .map((itemKey) => {
            return `${itemKey}: ${item[itemKey]}`;
          })
          .join("\n");
      })
      .join("\n----------\n");
    await write(`${DATA_DIR}/${name}.dta`, data);
  } catch (error) {
    console.log(error);
  }
}

export async function writeStore() {
  try {
    const collections = store.get("collections");
    const keys = Object.keys(collections);
    for (let x = 0; x < keys.length; x++) {
      const key = keys[x];
      if (!collections[key].length) {
        continue;
      }
      await storeToCollection(key);
      console.log(`Collection "${key}" is saved...`);
    }
  } catch (error) {
    console.log(error);
  }
}

export { aggregate, deleteOne, getAll, getOne, insert, queryParser, relate, unRelate, updateOne } from './src/queries'
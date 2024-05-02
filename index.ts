import { store } from "./src/store";
import { DATA_DIR, ORM_DIR } from "./src/dirs";
import { read, readdir, write } from "./src/promises";
import { IObject, INumObject } from "./src/types";

// парсит массив с полями из прочитанных данных в объект
function parseArrayToObject(arr: string[]): IObject {
  const obj: IObject = {};
  arr.forEach((item) => {
    const [key, value] = item.split(": ");
    obj[key] = value.slice(0, 1) === "!" ? value.slice(1, value.length) : value;
  });
  return obj;
}

/**
 * парсит поля типа gallery и тд
 **/
function parseObjectFields(obj: IObject, model: IObject) {
  const keys = Object.keys(obj);
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    const fieldType = model[key];
    if (!fieldType) {
      continue;
    }
    if (fieldType === "gallery") {
      obj[key] = JSON.parse(obj[key]);
    }
  }
  return obj;
}

/**
 * Читает модель (ORM), и возвращает в виде IObject
 **/
async function readModel(name: string): Promise<IObject> {
  const modelProxy = await read(`${ORM_DIR}/${name}.pxx`, "utf8");
  return parseArrayToObject(
    modelProxy
      .split("\n")
      .filter((x, i) => i > 0)
      .map((line) => line.trim()),
  );
}

async function readCollection(name: string): Promise<IObject[]> {
  try {
    const model: IObject = await readModel(name);

    const dataProxy = await read(`${DATA_DIR}/${name}.dta`, "utf8");
    const qwerty = dataProxy.split("----------").map((item) => {
      return item
        .split("\n")
        .filter((line) => line !== "")
        .map((line) => line.trim());
    });
    return qwerty.map((x) => parseObjectFields(parseArrayToObject(x), model));
  } catch (error) {
    return [];
  }
}

export async function bootstrap() {
  // имена моделей
  const modelFiles = await readdir(ORM_DIR);
  const modelNames = modelFiles.map((x) => x.replace(/\.[^/.]+$/, ""));

  const models: { [key: string]: IObject } = {};
  const collections: { [key: string]: IObject[] } = {};
  const indexes: { [key: string]: INumObject } = {};
  const maxIds: INumObject = {};

  // читаем файлы ORM, и коллекции, сохр-м в кэш
  for (let x = 0; x < modelNames.length; x++) {
    const name = modelNames[x];
    // ORM:
    const model = await readModel(name);
    models[name] = model;
    // коллекции:
    const collection = await readCollection(name);
    collections[name] = collection;
    // индексы:
    const collectionIndexes: INumObject = {};
    for (let y = 0; y < collection.length; y++) {
      const item = collection[y];
      collectionIndexes[item.id] = y;
    }
    indexes[name] = collectionIndexes;
    // максимумы id:
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

export async function storeToCollection(name: string): Promise<void> {
  try {
    const model: IObject = store.get('models')[name];
    const keys = Object.keys(model);
    const collection = store.get("collections")[name];
    const data = collection
      .map((item: IObject) => {
        for (let x = 0; x < keys.length; x++) {
          const key = keys[x];
          const fieldType = model[key];
          if(!fieldType) {
            continue;
          }
          if (fieldType === "gallery") {
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

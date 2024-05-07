import { processField, processRelation, removeRelations } from "./methods";
import { store } from "./store";
import { IObject, TOperator } from "./types";

// CREATE
export function insert(name: string, values: IObject) {
  console.log(values);
  try {
    const collection = store.get("collections");
    const maxId = setMaxId(name, 1);
    const newValues = { ...values, id: maxId };
    collection[name].push(newValues);
    store.set("collections", collection);
    return newValues;
  } catch (error) {
    console.log(error);
  }
}

// name: model(collection) name, arg: creation
function setMaxId(name: string, arg?: number): number {
  const collection: IObject[] = store.get("collections")[name];
  const maxIds = store.get("maxIds");
  let maxId = maxIds[name];
  const currentId = collection.length ? collection.map(x => x.id).reduce((a, b) => a > b ? a : b) : 0;

  if (maxId > currentId) {
    maxId = currentId;
  } else if (arg) {
    ++maxId;
  }

  maxIds[name] = maxId;
  store.set("maxIds", maxIds);
  return maxId;
}

// Only one element in the array
function xorArrays(arr1: any[], arr2: any[]): boolean {
  let count = 0;
  for (let i = 0; i < arr2.length; i++) {
    if (arr1.includes(arr2[i])) {
      count++;
    }
  }
  return count === 1;
}

// All elements in the object
function checkElementsInObject(obj: any, arr: any[]): boolean {
  const flatObject = JSON.stringify(obj).toLowerCase();
  return arr.every((element) =>
    flatObject.includes(JSON.stringify(element).toLowerCase()),
  );
}

// at least one element in the object
function isElementInObject(obj: IObject, arr: any[]): boolean {
  let result = false;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === "object") {
        result = isElementInObject(obj[key], arr); // Recursively check the nested objects
      } else {
        if (arr.includes(obj[key])) {
          // Check the field value equals to the element of the array
          result = true;
          break;
        }
      }
    }
  }
  return result;
}

const isOnlyElementInObject = (obj: IObject, arr: any[]): boolean => {
  let count = 0;
  const checkObject = (obj: IObject, val: any): boolean => {
    for (const key in obj) {
      if (obj[key] === val) {
        count++;
        if (count > 1) {
          return false;
        }
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        if (!checkObject(obj[key], val)) {
          return false;
        }
      }
    }
    return true;
  };
  for (const val of arr) {
    if (!checkObject(obj, val)) {
      return false;
    }
  }
  return count === 1;
};

/**
 * Used to filter the data in the Getall function.
 * Arguments:
 * 1. param - field value.
 * 2. value - The value of the same field in the document.
 * 3. key - operator.
 **/
function convertParam(params: IObject, value: any): boolean {
  const operators = Object.keys(params);
  for (let x = 0; x < operators.length; x++) {
    let inverse: boolean = false;
    let operator = operators[x] as TOperator;
    const param = params[operator];
    if (operator.slice(0, 1) === "!") {
      inverse = true;
      operator = operator.slice(1, operator.length - 1) as TOperator;
    }
    let result = getResult(operator, param);
    result = inverse ? !result : result;
    if (!result) return false;
  }
  function getResult(operator: TOperator, param: any): boolean {
    switch (operator) {
      case "==":
        return value === param;
      case ">":
        return value > param;
      case ">=":
        return value >= param;
      case "<":
        return value < param;
      case "<=":
        return value <= param;
      case "a&&":
        return JSON.parse(param).every((item: any) => value.includes(item));
      case "a||":
        return JSON.parse(param).some((item: any) => value.includes(item));
      case "a<>":
        return xorArrays(JSON.parse(param), value);
      case "o&&":
        return checkElementsInObject(JSON.parse(param), value);
      case "o||":
        return isElementInObject(JSON.parse(param), value);
      case "o<>":
        return isOnlyElementInObject(JSON.parse(param), value);
      default:
        return true;
    }
  }
  return true;
}

// READ ALL
export function getAll(
  modelName: string,
  paramsObj?: IObject,
  offset?: number,
  limit?: number,
) {
  try {
    let data: IObject[] = store.get("collections")[modelName];
    if (paramsObj) {
      data = data.filter((x) => {
        const keys = Object.keys(paramsObj);
        for (let y = 0; y < keys.length; y++) {
          const key = keys[y];
          const params = paramsObj[key];
          const value = x[key];
          if (!convertParam(params, value)) {
            return false;
          }
        }
        return true;
      });
    }
    return data.slice(offset || 0, limit ? offset || 0 + limit : data.length);
  } catch (error) {
    console.log(error);
  }
}

class IJoin {
  model: string;
  params: IObject;
}

// READ BY ID, join
/*
export function getOne(model: string, id: string, joins?: IJoin[]) {
  try {
    const data = store
      .get("collections")
      [model].filter((x: IObject) => x.id == id)[0];
    if (joins) {
      for (let x = 0; x < joins.length; x++) {
        const newJoin = joins[x];
        const joinData = getAll(newJoin.model, newJoin.params);
        data[newJoin.model] = joinData;
      }
    }
    return data;
  } catch (error) {
    console.log(error);
  }
}
*/

// Just find by id
function findById(name: string, id: string): IObject | undefined {
  return store.get("collections")[name].filter((x: IObject) => x.id == id)[0];
}

export function getOne(name: string, id: string): IObject | undefined {
  try {
    let data = findById(name, id);
    if (!data) {
      return;
    }

    const model = store.get("models")[name];
    const relationKeys = Object.keys(model).filter(
      (x) => model[x].split(" ").length > 1,
    );

    // Joins
    if (relationKeys) {
      for (let x = 0; x < relationKeys.length; x++) {
        const key = relationKeys[x];
        const rvalue = model[key];
        const relation = processRelation(rvalue);
        if (!relation) {
          continue;
        }
        switch (relation.operator) {
          case "<>":
            data[key] = store
              .get("collections")
            [relation.model].filter((y: IObject) => y.id == id)[0];
            break;

          case "<>>":
            if (relation.level === "host") {
              data[key] = store
                .get("collections")
              [relation.model].filter((y: IObject) => y[name] == id);
            }
            break;

          case "<<>>":
            if (relation.level === "host") {
              const relCollection =
                store.get("collections")[`${name}_${relation.model}`];
              if (!relCollection) break;
              data[key] = relCollection.filter((y: IObject) => y[name] === id).map((y: IObject) => {
                return store
                  .get("collections")
                [relation.model].filter((z: IObject) => z.id == y[relation.model])[0];
              })
            }
            break;

          case "<<|>>":
            const relCollection = store.get("collections")[`${name}_${relation.model}`] || store.get("collections")[`${relation.model}_${name}`];
            if (!relCollection) {
              break;
            }
            const qwerty = relCollection.filter((y: IObject) => y[name] === id).map((y: IObject) => {
              return store
                .get("collections")
              [relation.model].filter((z: IObject) => z.id == y[relation.model])
                .map((z: IObject) => removeRelations(name, z))
              [0];
            })

            data[key] = JSON.parse(JSON.stringify(qwerty))
            break;

          default:
            break;
        }
      }
    }
    return data;
  } catch (error) {
    console.log(error);
  }
}

// UPDATE
export function updateOne(model: string, values: IObject, id: string) {
  try {
    const collections = store.get("collections");
    const newData: IObject[] = collections[model];

    let filteredData = newData.filter((x) => x.id != id);
    filteredData = filteredData.concat([
      {
        id,
        ...values,
      },
    ]);
    collections[model] = filteredData;
    store.set("collections", collections);
  } catch (error) {
    console.log(error);
  }
}

// DELETE
export function deleteOne(name: string, id: string) {
  try {
    let collections = store.get("collections");
    const newData: IObject[] = collections[name];
    collections[name] = newData.filter((x) => x.id != id);
    cascade(name, id);
    store.set("collections", collections);
    setMaxId(name);
  } catch (error) {
    console.log(error);
  }
}

// delete related items
function cascade(name: string, id: string) {
  const collections = store.get('collections')
  const model: IObject = store.get("models")[name]
  const keys = Object.keys(model);
  const data: IObject = collections[name].filter((x: IObject) => x.id == id)[0]
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    const field = processField(model[key])
    const relation = processRelation(model[key])
    if (field?.type === "relation" && relation) {
      const rname = relation.model;
      const operator = relation.operator
      const level = relation.level;
      switch (operator) {
        case "<>":
          deleteOne(rname, data[rname].id);
          break;

        case "<>>":
          if (level === "host") {
            const relatedItems = data[rname]
            for (let y = 0; y < relatedItems.length; y++) {
              const item = relatedItems[y];
              deleteOne(rname, item.id);
            }
          }
          break;

        case "<<>>":
        case "<<|>>":
          const relatedItems = data[rname]
          const relCollectionName = collections[`${name}_${rname}`] ? `${name}_${rname}` : `${rname}_${name}`;
          let relCollection: IObject[] = collections[relCollectionName]
          for (let y = 0; y < relatedItems.length; y++) {
            const item = relatedItems[y];
            deleteOne(rname, item.id);
          }
          relCollection = relCollection.filter((x: IObject) => x[name] != name && x[rname] != rname);
          collections[relCollectionName] = relCollection;
          break;

        default:
          break;
      }
      store.set("collections", collections)
    }
  }
}

// RELATE
export function relate(
  host: string,
  recipient: string,
  hid: string,
  rid: string,
) {
  try {
    const name = `${host}_${recipient}`;
    const collections = store.get("collections");
    const collection: IObject[] = collections[name];

    const maxId = setMaxId(name, 1);

    const relation = { id: maxId, [host]: hid, [recipient]: rid };
    if (!collection) {
      collections[name] = [relation];
    } else {
      collections[name].push(relation);
    }
    store.set("collections", collections);
  } catch (error) {
    console.log(error);
  }
}

// REMOVE RELATION
export function unRelate(
  host: string,
  recipient: string,
  hid: string,
  rid: string,
) {
  try {
    const collections = store.get("collections");
    const rname = `${host}_${recipient}`
    let data: IObject[] = collections[rname];
    data = data.filter((x) => {
      if (x[host] === hid && x[recipient] === rid) {
        return false;
      } else {
        return true;
      }
    });
    collections[rname] = data;
    store.set("collections", collections);
    setMaxId(rname);
  } catch (error) {
    console.log(error);
  }
}

class IAggr {
  [key: string]: IJoin | IAggr | IAggr[];
}

// AGGREGATE
export function aggregate(aggr: IAggr) {
  function aggregator(arg: IAggr): any {
    const isArray = Array.isArray(arg);
    if (!isArray) {
      const keys = Object.keys(arg);
      for (let x = 0; x < keys.length; x++) {
        const key = keys[x];
        const value = arg[key];
        if (value instanceof IJoin) {
          return getAll(value.model, value.params);
        } else if (value instanceof IAggr) {
          if (Array.isArray(value)) {
            return value.map((elem) => aggregator(elem));
          } else {
            return aggregator(value);
          }
        }
      }
    } else {
      return arg.map((x) => aggregator(x));
    }
  }
  try {
    return aggregator(aggr);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Reads req.body and creates a query with the "special syntax".
 * Simplified version, works only with 2 data types. In progress...
 **/
export function queryParser(arg: IObject): IObject[] {
  const keys = Object.keys(arg);
  const result: IObject[] = [];
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    const value = arg[key];
    if (typeof value === "object") {
      result.push({ ">=": value[0], "<=": value[1] });
    } else {
      result.push({ "===": value });
    }
  }
  return result;
}
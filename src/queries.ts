import { store } from "./store";
import { IObject, TOperator } from "./types";

// CREATE
export function insert(model: string, values: IObject) {
  try {
    const newData = store.get("collections");
    const maxIds = store.get("maxIds");
    let maxId = maxIds[model];
    ++maxId;
    maxIds[model] = maxId;
    store.set("maxIds", maxIds);
    const newValues = { ...values, id: maxId };
    newData[model].push(newValues);
    store.set("collections", newData);
    return newValues;
  } catch (error) {
    console.log(error);
  }
}

// только один элемент в массиве
function xorArrays(arr1: any[], arr2: any[]): boolean {
  let count = 0;
  for (let i = 0; i < arr2.length; i++) {
    if (arr1.includes(arr2[i])) {
      count++;
    }
  }
  return count === 1;
}

// все элементы в объекте
function checkElementsInObject(obj: any, arr: any[]): boolean {
  const flatObject = JSON.stringify(obj).toLowerCase();
  return arr.every((element) =>
    flatObject.includes(JSON.stringify(element).toLowerCase()),
  );
}

// хотя бы один элемент в объекте
function isElementInObject(obj: IObject, arr: any[]): boolean {
  let result = false;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === "object") {
        result = isElementInObject(obj[key], arr); // Рекурсивно проверяем вложенные объекты
      } else {
        if (arr.includes(obj[key])) {
          // Проверяем значение поля на совпадение с элементом массива
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
 * Принимает аргументы:
 * 1. param - та самая абракадабра, значение поля запроса.
 * 2. value - значение того же поля записи.
 * 3. key - поле.
 **/
function parseParam2(params: IObject, value: any): boolean {
  const operators = Object.keys(params);
  for (let x = 0; x < operators.length; x++) {
    let inverse: boolean = false;
    // let has: boolean = false;
    let operator = operators[x] as TOperator;
    const param = params[operator];
    if (operator.slice(0, 1) === "!") {
      inverse = true;
      operator = operator.slice(1, operator.length - 1) as TOperator;
    }
    // if (operator.slice(-1) === "^") {
    //   has = true;
    //   operator = operator.slice(0, operator.length - 2) as TOperator;
    // }
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
          if (!parseParam2(params, value)) {
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
export function deleteOne(model: string, id: string) {
  try {
    const collections = store.get("collections");
    const newData: IObject[] = collections[model];
    collections[model] = newData.filter((x) => x.id != id);
    store.set("collections", collections);
  } catch (error) {
    console.log(error);
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
    const relation = { [host]: hid, [recipient]: rid };
    const collections = store.get("collections");
    const data: IObject[] = collections[`${host}_${recipient}`];
    if (!data) {
      collections[`${host}_${recipient}`] = [relation];
    } else {
      collections[`${host}_${recipient}`].push(relation);
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
    let data: IObject[] = collections[`${host}_${recipient}`];
    data = data.filter((x) => {
      if (x[host] === hid && x[recipient] === rid) {
        return false;
      } else {
        return true;
      }
    });
    collections[`${host}_${recipient}`] = data;
    store.set("collections", collections);
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
    //
    return aggregator(aggr);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Парсит параметры запроса и создает запрос со специальным синтаксисом.
 * Сейчас это предварительная версия. Не работает с моделью.
 * Распознает 2 вида. Упрощенный вариант.
 * На клиенте (не в админке) можно создавать запросы и собственные парсеры.
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

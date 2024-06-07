/**
 * encryption using "one-time notebook" method
 **/

import { store } from "./store";
import { IObject, IRelation } from "./types";

export function oneTimePadEncrypt(plainText: string, key: string): string {
  let encryptedText = "";
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encryptedText += String.fromCharCode(charCode);
  }
  return encryptedText;
}

export function oneTimePadDecrypt(encryptedText: string, key: string): string {
  let decryptedText = "";
  for (let i = 0; i < encryptedText.length; i++) {
    const charCode =
      encryptedText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    decryptedText += String.fromCharCode(charCode);
  }
  return decryptedText;
}

export interface IFfieldInfo {
  type: "single" | "array" | "object" | "relation";
  data: string;
}

// Detect field type, - single, array, object, relation
export function parseField(arg: string): IFfieldInfo | void {
  if (!arg) {
    return;
  }
  try {
    if (arg.slice(0, 1) === "[" && arg.slice(-1) === "]") {
      return {
        data: arg.slice(1, arg.length - 1),
        type: "array",
      };
    } else if (arg.slice(0, 1) === "{" && arg.slice(-1) === "}") {
      return {
        data: arg.slice(1, arg.length - 1),
        type: "object",
      };
    } else if (processRelation(arg)) {
      //
      return {
        data: arg,
        type: "relation",
      };
    } else {
      return {
        data: arg,
        type: "single",
      };
    }
  } catch (error) {
    console.log(`parseField error: ${error}`);
    return;
  }
}

export function processRelation(arg: string): IRelation | void {
  const result: IObject = {};
  const arr = arg.split(" ");
  if (arr.length <= 1) {
    return;
  }
  const operator = arr[0];
  const rel = arr[1];
  result.model = rel.slice(2, rel.length - 1);
  if (operator.slice(0, 1) === "|") {
    result.level = "host";
    result.operator = operator.slice(1, operator.length);
  } else if (operator.slice(-1) === "|") {
    result.level = "recipient";
    result.operator = operator.slice(0, operator.length - 1);
  } else {
    result.level = "bi";
    result.operator = operator;
  }
  return result as IRelation;
}

// Split by first separator
export function splitField(str: string, separator: string): string[] {
  const index = str.indexOf(separator);
  if (index === -1) {
    return [str];
  }
  const firstPart = str.substring(0, index);
  const secondPart = str.substring(index + separator.length);
  return [firstPart, secondPart];
}

// Remove field from object
export function removeField(obj: IObject, field: string): IObject {
  if (Object.prototype.hasOwnProperty.call(obj, field)) {
    const newObj = { ...obj };
    delete newObj[field];
    return newObj;
  }
  return obj;
}

// Remove all relation fields
export function removeRelations(modelName: string, obj: IObject): IObject {
  const model = store.get("models")[modelName];
  const keys = Object.keys(obj);
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    const field = parseField(model[key]);
    if (field?.type === "relation") {
      obj = removeField(obj, key);
    }
  }
  return obj;
}

export function replaceInValues(
  values: IObject,
  source: string,
  replace: string,
): IObject {
  const keys = Object.keys(values);
  for (let x = 0; x < keys.length; x++) {
    const key = keys[x];
    values[key] = values[key].replaceAll(source, replace);
  }
  return values;
}

export function filterFields(data: IObject[], fields?: string[]): IObject[] {
  if (!fields || fields.length === 0) {
    return data;
  } else {
    return data.map(item => {
      const newItem: IObject = {};
      fields.forEach(field => {
        if (item.hasOwnProperty(field)) {
          newItem[field] = item[field];
        }
      });
      return newItem;
    });
  }
}
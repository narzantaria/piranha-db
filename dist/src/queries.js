"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryParser = exports.aggregate = exports.unRelate = exports.relate = exports.deleteOne = exports.updateOne = exports.getOne = exports.getAll = exports.insert = void 0;
const methods_1 = require("./methods");
const store_1 = require("./store");
// CREATE
function insert(name, values) {
    console.log(values);
    try {
        const collection = store_1.store.get("collections");
        const maxId = setMaxId(name, 1);
        const newValues = { ...values, id: maxId };
        collection[name].push(newValues);
        store_1.store.set("collections", collection);
        return newValues;
    }
    catch (error) {
        console.log(error);
    }
}
exports.insert = insert;
// name: model(collection) name, arg: creation
function setMaxId(name, arg) {
    const collection = store_1.store.get("collections")[name];
    const maxIds = store_1.store.get("maxIds");
    let maxId = maxIds[name];
    const currentId = collection.length ? collection.map(x => x.id).reduce((a, b) => a > b ? a : b) : 0;
    if (maxId > currentId) {
        maxId = currentId;
    }
    else if (arg) {
        ++maxId;
    }
    maxIds[name] = maxId;
    store_1.store.set("maxIds", maxIds);
    return maxId;
}
// Only one element in the array
function xorArrays(arr1, arr2) {
    let count = 0;
    for (let i = 0; i < arr2.length; i++) {
        if (arr1.includes(arr2[i])) {
            count++;
        }
    }
    return count === 1;
}
// All elements in the object
function checkElementsInObject(obj, arr) {
    const flatObject = JSON.stringify(obj).toLowerCase();
    return arr.every((element) => flatObject.includes(JSON.stringify(element).toLowerCase()));
}
// at least one element in the object
function isElementInObject(obj, arr) {
    let result = false;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === "object") {
                result = isElementInObject(obj[key], arr); // Recursively check the nested objects
            }
            else {
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
const isOnlyElementInObject = (obj, arr) => {
    let count = 0;
    const checkObject = (obj, val) => {
        for (const key in obj) {
            if (obj[key] === val) {
                count++;
                if (count > 1) {
                    return false;
                }
            }
            else if (typeof obj[key] === "object" && obj[key] !== null) {
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
function convertParam(params, value) {
    const operators = Object.keys(params);
    for (let x = 0; x < operators.length; x++) {
        let inverse = false;
        let operator = operators[x];
        const param = params[operator];
        if (operator.slice(0, 1) === "!") {
            inverse = true;
            operator = operator.slice(1, operator.length - 1);
        }
        let result = getResult(operator, param);
        result = inverse ? !result : result;
        if (!result)
            return false;
    }
    function getResult(operator, param) {
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
                return JSON.parse(param).every((item) => value.includes(item));
            case "a||":
                return JSON.parse(param).some((item) => value.includes(item));
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
function getAll(modelName, paramsObj, offset, limit) {
    try {
        let data = store_1.store.get("collections")[modelName];
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
    }
    catch (error) {
        console.log(error);
    }
}
exports.getAll = getAll;
class IJoin {
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
function findById(name, id) {
    return store_1.store.get("collections")[name].filter((x) => x.id == id)[0];
}
function getOne(name, id) {
    try {
        let data = findById(name, id);
        if (!data) {
            return;
        }
        const model = store_1.store.get("models")[name];
        const relationKeys = Object.keys(model).filter((x) => model[x].split(" ").length > 1);
        // Joins
        if (relationKeys) {
            for (let x = 0; x < relationKeys.length; x++) {
                const key = relationKeys[x];
                const rvalue = model[key];
                const relation = (0, methods_1.processRelation)(rvalue);
                if (!relation) {
                    continue;
                }
                switch (relation.operator) {
                    case "<>":
                        data[key] = store_1.store
                            .get("collections")[relation.model].filter((y) => y.id == id)[0];
                        break;
                    case "<>>":
                        if (relation.level === "host") {
                            data[key] = store_1.store
                                .get("collections")[relation.model].filter((y) => y[name] == id);
                        }
                        break;
                    case "<<>>":
                        if (relation.level === "host") {
                            const relCollection = store_1.store.get("collections")[`${name}_${relation.model}`];
                            if (!relCollection)
                                break;
                            data[key] = relCollection.filter((y) => y[name] === id).map((y) => {
                                return store_1.store
                                    .get("collections")[relation.model].filter((z) => z.id == y[relation.model])[0];
                            });
                        }
                        break;
                    case "<<|>>":
                        const relCollection = store_1.store.get("collections")[`${name}_${relation.model}`] || store_1.store.get("collections")[`${relation.model}_${name}`];
                        if (!relCollection) {
                            break;
                        }
                        const qwerty = relCollection.filter((y) => y[name] === id).map((y) => {
                            return store_1.store
                                .get("collections")[relation.model].filter((z) => z.id == y[relation.model])
                                .map((z) => (0, methods_1.removeRelations)(name, z))[0];
                        });
                        data[key] = JSON.parse(JSON.stringify(qwerty));
                        break;
                    default:
                        break;
                }
            }
        }
        return data;
    }
    catch (error) {
        console.log(error);
    }
}
exports.getOne = getOne;
// UPDATE
function updateOne(model, values, id) {
    try {
        const collections = store_1.store.get("collections");
        const newData = collections[model];
        let filteredData = newData.filter((x) => x.id != id);
        filteredData = filteredData.concat([
            {
                id,
                ...values,
            },
        ]);
        collections[model] = filteredData;
        store_1.store.set("collections", collections);
    }
    catch (error) {
        console.log(error);
    }
}
exports.updateOne = updateOne;
// DELETE
function deleteOne(name, id) {
    try {
        let collections = store_1.store.get("collections");
        const newData = collections[name];
        collections[name] = newData.filter((x) => x.id != id);
        cascade(name, id);
        store_1.store.set("collections", collections);
        setMaxId(name);
    }
    catch (error) {
        console.log(error);
    }
}
exports.deleteOne = deleteOne;
// delete related items
function cascade(name, id) {
    const collections = store_1.store.get('collections');
    const model = store_1.store.get("models")[name];
    const keys = Object.keys(model);
    const data = collections[name].filter((x) => x.id == id)[0];
    for (let x = 0; x < keys.length; x++) {
        const key = keys[x];
        const field = (0, methods_1.processField)(model[key]);
        const relation = (0, methods_1.processRelation)(model[key]);
        if (field?.type === "relation" && relation) {
            const rname = relation.model;
            const operator = relation.operator;
            const level = relation.level;
            switch (operator) {
                case "<>":
                    deleteOne(rname, data[rname].id);
                    break;
                case "<>>":
                    if (level === "host") {
                        const relatedItems = data[rname];
                        for (let y = 0; y < relatedItems.length; y++) {
                            const item = relatedItems[y];
                            deleteOne(rname, item.id);
                        }
                    }
                    break;
                case "<<>>":
                case "<<|>>":
                    const relatedItems = data[rname];
                    const relCollectionName = collections[`${name}_${rname}`] ? `${name}_${rname}` : `${rname}_${name}`;
                    let relCollection = collections[relCollectionName];
                    for (let y = 0; y < relatedItems.length; y++) {
                        const item = relatedItems[y];
                        deleteOne(rname, item.id);
                    }
                    relCollection = relCollection.filter((x) => x[name] != name && x[rname] != rname);
                    collections[relCollectionName] = relCollection;
                    break;
                default:
                    break;
            }
            store_1.store.set("collections", collections);
        }
    }
}
// RELATE
function relate(host, recipient, hid, rid) {
    try {
        const name = `${host}_${recipient}`;
        const collections = store_1.store.get("collections");
        const collection = collections[name];
        const maxId = setMaxId(name, 1);
        const relation = { id: maxId, [host]: hid, [recipient]: rid };
        if (!collection) {
            collections[name] = [relation];
        }
        else {
            collections[name].push(relation);
        }
        store_1.store.set("collections", collections);
    }
    catch (error) {
        console.log(error);
    }
}
exports.relate = relate;
// REMOVE RELATION
function unRelate(host, recipient, hid, rid) {
    try {
        const collections = store_1.store.get("collections");
        const rname = `${host}_${recipient}`;
        let data = collections[rname];
        data = data.filter((x) => {
            if (x[host] === hid && x[recipient] === rid) {
                return false;
            }
            else {
                return true;
            }
        });
        collections[rname] = data;
        store_1.store.set("collections", collections);
        setMaxId(rname);
    }
    catch (error) {
        console.log(error);
    }
}
exports.unRelate = unRelate;
class IAggr {
}
// AGGREGATE
function aggregate(aggr) {
    function aggregator(arg) {
        const isArray = Array.isArray(arg);
        if (!isArray) {
            const keys = Object.keys(arg);
            for (let x = 0; x < keys.length; x++) {
                const key = keys[x];
                const value = arg[key];
                if (value instanceof IJoin) {
                    return getAll(value.model, value.params);
                }
                else if (value instanceof IAggr) {
                    if (Array.isArray(value)) {
                        return value.map((elem) => aggregator(elem));
                    }
                    else {
                        return aggregator(value);
                    }
                }
            }
        }
        else {
            return arg.map((x) => aggregator(x));
        }
    }
    try {
        return aggregator(aggr);
    }
    catch (error) {
        console.log(error);
    }
}
exports.aggregate = aggregate;
/**
 * Reads req.body and creates a query with the "special syntax".
 * Simplified version, works only with 2 data types. In progress...
 **/
function queryParser(arg) {
    const keys = Object.keys(arg);
    const result = [];
    for (let x = 0; x < keys.length; x++) {
        const key = keys[x];
        const value = arg[key];
        if (typeof value === "object") {
            result.push({ ">=": value[0], "<=": value[1] });
        }
        else {
            result.push({ "===": value });
        }
    }
    return result;
}
exports.queryParser = queryParser;

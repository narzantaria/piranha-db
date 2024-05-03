"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryParser = exports.aggregate = exports.unRelate = exports.relate = exports.deleteOne = exports.updateOne = exports.getOne = exports.getAll = exports.insert = void 0;
const store_1 = require("./store");
// CREATE
function insert(model, values) {
    try {
        const newData = store_1.store.get("collections");
        const maxIds = store_1.store.get("maxIds");
        let maxId = maxIds[model];
        ++maxId;
        maxIds[model] = maxId;
        store_1.store.set("maxIds", maxIds);
        const newValues = { ...values, id: maxId };
        newData[model].push(newValues);
        store_1.store.set("collections", newData);
        return newValues;
    }
    catch (error) {
        console.log(error);
    }
}
exports.insert = insert;
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
 * 1. param - та самая абракадабра, значение поля запроса.
 * 2. value - The value of the same field in the document.
 * 3. key - operator.
 **/
function parseParam2(params, value) {
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
                    if (!parseParam2(params, value)) {
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
function getOne(model, id, joins) {
    try {
        const data = store_1.store
            .get("collections")[model].filter((x) => x.id == id)[0];
        if (joins) {
            for (let x = 0; x < joins.length; x++) {
                const newJoin = joins[x];
                const joinData = getAll(newJoin.model, newJoin.params);
                data[newJoin.model] = joinData;
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
function deleteOne(model, id) {
    try {
        const collections = store_1.store.get("collections");
        const newData = collections[model];
        collections[model] = newData.filter((x) => x.id != id);
        store_1.store.set("collections", collections);
    }
    catch (error) {
        console.log(error);
    }
}
exports.deleteOne = deleteOne;
// RELATE
function relate(host, recipient, hid, rid) {
    try {
        const relation = { [host]: hid, [recipient]: rid };
        const collections = store_1.store.get("collections");
        const data = collections[`${host}_${recipient}`];
        if (!data) {
            collections[`${host}_${recipient}`] = [relation];
        }
        else {
            collections[`${host}_${recipient}`].push(relation);
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
        let data = collections[`${host}_${recipient}`];
        data = data.filter((x) => {
            if (x[host] === hid && x[recipient] === rid) {
                return false;
            }
            else {
                return true;
            }
        });
        collections[`${host}_${recipient}`] = data;
        store_1.store.set("collections", collections);
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

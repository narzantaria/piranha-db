"use strict";
/**
 * encryption using "one-time notebook" method
 **/
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitField = exports.parseField = exports.oneTimePadDecrypt = exports.oneTimePadEncrypt = void 0;
function oneTimePadEncrypt(plainText, key) {
    let encryptedText = "";
    for (let i = 0; i < plainText.length; i++) {
        const charCode = plainText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        encryptedText += String.fromCharCode(charCode);
    }
    return encryptedText;
}
exports.oneTimePadEncrypt = oneTimePadEncrypt;
function oneTimePadDecrypt(encryptedText, key) {
    let decryptedText = "";
    for (let i = 0; i < encryptedText.length; i++) {
        const charCode = encryptedText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decryptedText += String.fromCharCode(charCode);
    }
    return decryptedText;
}
exports.oneTimePadDecrypt = oneTimePadDecrypt;
// detect field type, - single, array or object
function parseField(arg) {
    if (arg.slice(0, 1) === "[" && arg.slice(-1) === "]") {
        return {
            data: arg.slice(1, arg.length - 1),
            type: 'array'
        };
    }
    else if (arg.slice(0, 1) === "{" && arg.slice(-1) === "}") {
        return {
            data: arg.slice(1, arg.length - 1),
            type: 'object'
        };
    }
    else {
        return {
            data: arg,
            type: 'single'
        };
    }
}
exports.parseField = parseField;
// Split string by first separator
// export function splitField(str: string, separator: string): string[] {
//   const index = str.indexOf(separator);
//   if (index !== -1) {
//       const firstPart = str.slice(0, index);
//       const secondPart = str.slice(index + 1);
//       return [firstPart, secondPart];
//   }
//   return [str];
// }
function splitField(str, separator) {
    const index = str.indexOf(separator);
    if (index === -1) {
        return [str];
    }
    const firstPart = str.substring(0, index);
    const secondPart = str.substring(index + separator.length);
    return [firstPart, secondPart];
}
exports.splitField = splitField;

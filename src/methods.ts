/**
 * encryption using "one-time notebook" method
 **/

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

interface IFfieldInfo {
  type: 'single' | 'array' | 'object';
  data: string;
}

// detect field type, - single, array or object
export function parseField(arg: string): IFfieldInfo {
  if (arg.slice(0, 1) === "[" && arg.slice(-1) === "]") {
    return {
      data: arg.slice(1, arg.length - 1),
      type: 'array'
    }
  } else if (arg.slice(0, 1) === "{" && arg.slice(-1) === "}") {
    return {
      data: arg.slice(1, arg.length - 1),
      type: 'object'
    }
  } else {
    return {
      data: arg,
      type: 'single'
    }
  }
}

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

export function splitField(str: string, separator: string): string[] {
  const index = str.indexOf(separator);
  if (index === -1) {
    return [str];
  }

  const firstPart = str.substring(0, index);
  const secondPart = str.substring(index + separator.length);

  return [firstPart, secondPart];
}
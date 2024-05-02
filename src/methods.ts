/**
 * шифрование методом "одноразовый блокнот"
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

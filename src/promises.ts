import fs, { promises } from "fs";
import fse from "fs-extra";
import util from "util";
import ChildProcess from "child_process";

export const unlink = util.promisify(fs.unlink);
export const readdir = util.promisify(fs.readdir);
export const mkdir = util.promisify(fs.mkdir);
export const rename = util.promisify(fs.rename);
export const rmdir = util.promisify(fs.rmdir);
export const lstat = util.promisify(fs.lstat);
export const stat = util.promisify(fs.stat);
export const read = util.promisify(fs.readFile);
export const copyFile = util.promisify(fs.copyFile);
export const copy = util.promisify(fse.copy);
export const write = util.promisify(fs.writeFile);
export const access = util.promisify(fs.access);
export const exec = util.promisify(ChildProcess.exec);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_DIR = exports.ORM_DIR = void 0;
const pdbconfig_1 = require("../pdbconfig");
const { dataFolder, modelsFolder } = pdbconfig_1.pdbconfig;
exports.ORM_DIR = `${process.cwd()}/${modelsFolder}`;
exports.DATA_DIR = `${process.cwd()}/${dataFolder}`;

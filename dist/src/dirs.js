"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUERIES_DIR = exports.DATA_DIR = exports.MODELS_DIR = void 0;
const dbconfig_1 = require("../dbconfig");
const { dataFolder, modelsFolder, queriesFolder } = dbconfig_1.dbconfig;
exports.MODELS_DIR = `${process.cwd()}/${modelsFolder}`;
exports.DATA_DIR = `${process.cwd()}/${dataFolder}`;
exports.QUERIES_DIR = `${process.cwd()}/${queriesFolder}`;

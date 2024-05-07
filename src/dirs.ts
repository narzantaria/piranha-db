import { pdbconfig } from "../pdbconfig";

const { dataFolder, modelsFolder } = pdbconfig;

export const ORM_DIR = `${process.cwd()}/${modelsFolder}`;
export const DATA_DIR = `${process.cwd()}/${dataFolder}`;

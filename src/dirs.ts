const { dbconfig } = require(`${process.cwd()}/dbconfig`);

const { dataFolder, modelsFolder, queriesFolder } = dbconfig;

export const MODELS_DIR = `${process.cwd()}/${modelsFolder}`;
export const DATA_DIR = `${process.cwd()}/${dataFolder}`;
export const QUERIES_DIR = `${process.cwd()}/${queriesFolder}`;

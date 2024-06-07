export interface IObject {
  [key: string]: any;
}
export interface INumObject {
  [key: string]: number;
}
export interface ICollection {
  [key: string]: IObject[];
}

export type TOperator =
  | "=="
  | ">"
  | "<"
  | ">="
  | "<="
  | "[]"
  | "()"
  | "a||"
  | "a&&"
  | "a<>"
  | "o||"
  | "o&&"
  | "o<>";

export interface IRelation {
  model: string;
  operator: string;
  level: "host" | "recipient" | "bi";
}

export class IJoin {
  model: string;
  params: IObject;
}

export interface IAggr {
  model?: string;
  name?: string;
  params?: IObject;
  data?: IAggr[];
  offset?: number;
  limit?: number;
  fields?: string[];
  headers?: IObject;
}

export interface IQuery {
  name: string;
  description?: string;
  format?: "json" | "string";
  fields?: string[];
  extension?: string;
  code: string;
}
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
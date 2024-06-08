# piranha-db

Flat-file system database that works in node.js environment. 

**THE PROJECT NAME IS TEMPORARY.**
<!--
### Why?

![why](media/why.png)
-->

The library was created for small and medium projects without the need to install special database management systems. At the same time, there are some signs of a relational database, including cascading deletion, own query syntax, aggregation, etc. **Piranha -DB** is not designed to replace a full-featured database management system - for this there is postgreSQL and other software. At this stage, the project is under testing. Next, we consider the main functions, after which it will be clear to you in which cases you will use it.

The library is used to operate data in the [Iris](https://github.com/narzantaria/iris-data) project, but can be used independently within any other application.

### Basic features

**Piranha-DB** uses in-memory cache during workflow, saving data on a hard drive in text file format with special marking. The database has some relational features, the following types of relations are implemented:

* one-to-one;
* one-to-many;
* many-to-many;
* many-to-many-bidirectional;

To operate with data, Piranha-DB uses a ORM-like model that has its own syntax (see [model](#model) section below).

### Installation

> npm install --save piranha-db

or

> yarn add piranha-db

### Usage

To use Piranha-DB, first of all, it is necessary to start its main functions for creating a cache, reading and synchronization of data. If you use a web server or an application based on *node.js*, then in the main index file you need to call the following functions.

```javascript
import { bootstrap, store, writeStore } from "piranha-db";

/* ... */

// One of the main functions that loads the database and models to in-memory store, performs their initial processing etc.
bootstrap();

setInterval(async () => {
  const date = new Date();
  if (date.getMinutes() === 0) {
    // This will run every hour
    await writeStore();
  }
}, 1000 * 60);

// This will run on terminating the main process or server, for example pressing Ctrl+C
process.on("SIGINT", async () => {
  // Update local data from store
  await writeStore();

  // clear the store
  store.clear();

  server.close(() => {
    process.exit(0);
  });
});
```

In addition, you can create a configuration file at the root of your application or server with the name **dbconfig.json**.

```json
{
  "MODELS_DIR": "models",
  "DATA_DIR": "db",
  "QUERIES_DIR": "queries",
  "ITEM_SEPARATOR": "----------",
  "JOINS": true,
  "MAGIC_KEY": "12345"
}
```

### Model

The model is a special file used to interpret the data for further processing by JavaScript. To record models, a special syntax is used with data types and relationships. Files have an extension "mod".

As an example, consider the following code (hero.mod):

```
~hero:
dir: string
title: !string
description: string
text: !string
experience: !int
images: [string]
features: {string}
createdAt: !date
skills: <<|>> [~skill]
```
The first line begins with the sign "~" and means the name of the collection. After the name follows the colon. The following are the lines with the names of the fields and their types. In total, the following types of data are supported: `string`, `int`, `double`, `boolean`, `json`, `date`, `relation`.

The type identifier can be enclosed in square or curly brackets, and there can also be an exclamation mark (!) in front of it.

Data in any case will be stored as a string. Identifiers indicate only how they will be processed when loading and saving, as well as in special queries.

For example, in the *hero* model, the *galleries* field will be stored as a string, but will be represented as an array in a request payload.

1. Square brackets define the field as an array. Example: `[string]`.
2. Round brackets - like an object. Example: `{string}`.
3. The exclamation mark means that the field is non-null. Examples: `!string`, `![string]`.

The last line represents the relationship with another collection (model). Relations will be considered below.

### Relations

Fields representing a relationship have a special marker. Consider these markers in more detail.

For example, relationships like "One-to-Many" have a marker "| <>>" or "<>> |". A vertical feature means parental (left) or a subsidiary (right). Below is a complete list of relationships and markers.

1. "One-to-one": "|<>" (parent), "<>|" (child).
2. "One-to-many": "|<>>" (parent), "<>>|" (child).
3. "Many-to-many": "|<<>>" (parent), "<<>>|" (child).
2. "Many-to-many-bidirectional": "<<|>>".

We draw your attention to the fact that in the first two cases, by default, cascading removal is used.

### Queries

There are several types of queries to get data.

#### `insert(name, values)`

Create a new entry in the `name` collection with `values` ​​data. Example:

```javascript
insert("hero", {
  name: "Sandro",
  description: "Necromancer",
  text: "Sandro was ..."
  /* other values */
});
```

#### `getAll(name, params, offset, limit, fields)`

Get all documents from the `name` collection. If you do not specify any additional arguments, then you will receive all the records. Example:

```javascript
const data = getAll("hero");
```

The query returns json like:

```json
[
    {
        "id": "1",
        "title": "Sandro",
        "description": "Necromancer",
        "images": [
            "q32h1ejdtppapb3mdgvt.jpg"
        ],
        /* ... */
    }
    /* ... */
]
```

Query parameters (params) have a special syntax:

```
{
  field: { operator: value },
  /* ... */
}
```

The results of the request are filtered according to the parameters. Consider in more detail. `operator` can take the following values:

* `"=="`: equals to;
* `">"`: greater than;
* `">="`: greater than or equals;
* `"<"`: less than;
* `"<="`: less than or equals;
* `"[]"`: the range of values ​​including the first and last;
* `"()"`: the range of values excluding the first and last;
* `"a&&"`: the array includes each array value (AND);
* `"a||"`: the array includes at least one array value (OR);
* `"a<>"`: the array includes only one array value (XOR);
* `"o&&"`: the object includes each array value (AND);
* `"o||"`: the object includes at least one array value (OR);
* `"o<>"`: the object includes only one array value (XOR);

An example of a query with parameters:

```javascript
const data = getAll("post", {
  looks: { "()": [100, 500] },
  tags: { "a&&": [ "sport", "nature" ] }
});
```

The query returns json like:

```json
[
  {
    "id": 3,
    "looks": 101,
    "tags": [ "sport", "nature", "surfing", "extreme" ],
    /* ... */
  },
  {
    "id": 3,
    "looks": 101,
    "tags": [ "sport", "hiking", "nature" ],
    /* ... */
  },
  /* ... */
]
```

#### `getOne(name, id)`

Get one document from the `name` collection by `id`. By default the related documents are joined to result. Example:

```javascript
const data = getOne("hero", 1);
```

The query returns json like:

```json
{
    "id": "1",
    "title": "Sandro",
    "description": "Necromancer",
    "images": [
        "q32h1ejdtppapb3mdgvt.jpg"
    ],
    /* ... */
}
```

#### `updateOne(name, values, id)`

Find a document from the `name` collection by `id` and update. Example:

```javascript
const data = updateOne("hero", {
  name: "Jabarkas",
  description: "Barbarian",
  text: "Jabarkas was ..."
  /* other values */
}, 3);
```

#### `relate(host, recipient, hid, rid)`

Relate two documents from `host` and `recipient` collections. Used only with "many-to-many" and "many-to-many-bi" relationships.

```javascript
relate("hero", "skill", 1, 3);
```

#### `unRelate(host, recipient, hid, rid)`

"Un-relate" (remove the relation) two documents from `host` and `recipient` collections. Used only with "many-to-many" and "many-to-many-bi" relationships.

```javascript
unRelate("hero", "skill", 1, 3);
```

#### `aggregate(aggr)`

Aggregation is a complex query to one or multiple collections.

In general, it is an array of several queries, each of which may also contain queries. Each query can have the following fields, none of which is required:

* "model": the collection to which the query is performed;
* "name": specifies the field name;
* "params": the query params (see `getAll`);
* "offset": the number of the received records to be skipped;
* "limit": the maximum number of requested records;
* "fields": specifies the fields of the model that will be at the query result;
* "headers": specifies the headers for the corresponding fields that will be rendered in the table;
* "data": internal array with other queries;

An example of an aggregate query:

```javascript
const data = aggregate([
  {
    model: "hero",
    params: { class: { "==": "mage" }, experience: { ">=": 15000 } }
  },
  {
    name: "skills",
    data: [
      {
        model: "skill",
        params: {
          title: { "==": "Wisdom" }
        }
      }
    ]
  }
]);
```
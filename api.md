# DynaDoc API

The API docs are primarily based on comments from the source. This guide also includes examples of API usage.


- [`DynaDoc Functions`](#dynadoc-functions)
  - [`setGlobalOptions(options)`](#setglobaloptionsoptions)
  - [`removeGlobalOption(optionName)`](#removeglobaloptionoptionname)
  - [`getGlobalOption(optionName)`](#getglobaloptionoptionname)
  - [`hasGlobalOption(optionName)`](#hasglobaloptionoptionname)
  - [`createClient(AWS)`](#createclient)
  - [`describeTable('<TableName>')`](#describetable)
  - [`query(indexName, hashValue, options)`](#queryindexname-hashvalue-options)
  - [`between(indexName, hashValue, lowerRangeValue, upperRangeValue, options)`](#betweenindexname-hashvalue-lowerrangevalue-upperrangevalue-options)
  - [`batchGet(arrayOfTableNames, batchGetKeyObject, options)`](#batchgetarrayoftablenames-batchgetkeyobject-options))
  - [`batchWrite(arrayOfTableNames, options)`](#batchwritearrayoftablenames-options)
  - [`DynaDoc Dynamo DocumentClient Promise API`](#dynadoc-dynamo-documentclient-promise-api)
  - [`putItem(item, options)`](#putitemitem-options)
  - [`getItem(key)`](#getitemkey)
  - [`queryOne(indexName, keyConditionExpression, expressionAttributeValues, expressionAttributeNames)`](#queryoneindexname-keyconditionexpression-expressionattributevalues-expressionattributenames))
  - [`deleteItem(key, options)`](#deleteitemkey-options)
  - [`updateItem(params)`](#updateitemparams)
  - [`setSettings(userSettings)`](#setsettingsusersettings)
  - [`getTableName()`](#gettablename)
  - [`printSettings()`](#printsettings)
  - [`DyModel`](#dymodel)
    - [`Getting Started`](#getting-started)
    - [`DyModel Methods`](#dymodel-methods)
      - [`primaryIndex(hashKey, rangeKey)`](#primaryindexhashkey-rangekey)
      - [`globalIndex(indexName, hashkey, options)`](#globalindexindexname-hashkey-options)
      - [`updateGlobalIndex(indexName, readCapacity, writeCapacity)`](#updateglobalindexindexname-readcapacity-writecapacity)
      - [`localIndex(indexName, rangeKey, options)`](#localindexindexname-rangekey-options)
      - [`deleteIndex(indexName)`](#deleteindexindexname)
      - [`setTableThroughput(readCapacity, writeCapacity)`](#settablethroughputreadcapacity-writecapacity)
      - [`getThroughput()`](#getthroughput)
      - [`setMaxThroughput(max)`](#setmaxthroughputmax)
      - [`setDynamoStreams(streamEnabled, streamType)`](#setdynamostreamsstreamenabled-streamtype)
      - [`isTableActive()`](#istableactive)
      - [`createTable(ignoreAlreadyExists)`](#createtableignorealreadyexists)
      - [`updateTable()`](#updatetable)
      - [`getTablePayload()`](#gettablepayload)
      - [`toSimpleObject()`](#tosimpleobject)
      - [`resetTablePayload()`](#resettablepayload)
      - [`buildUpdate(newObject, options)`](#buildupdatenewobject-options)
        - [`add(key, options)`](#addkey-options)
        - [`set(key, options)`](#setkey-options)
        - [`setList(key, options)`](#setlistkey-options)
        - [`remove(key, options)`](#removekey-options)
        - [`deleteSet(key, options)`](#deletesetkey-options)
        - [`getPayload()`](#getpayload)
        - [`compilePayload()`](#compilepayload)
        - [`isLocked()`](#islocked)
        - [`send()`](#send)
      - [`validate(object, options, callback)`](#validateobject-options-callback)
      - [`assert(object, message)`](#assertobject-message)
      - [`attempt(object, message)`](#assertobject-message)


## `DynaDoc Functions`

Easy functions are the heart of DynaDoc. DynaDoc generates the payload and everything that is necessary to make a query to DynamoDB. In order to use these functions, the describeTable() method must be called first or you must setup the
a DyModel schema with Joi (Highly Recommended).

Before using other DynaDoc functions, be sure to call `describeTable()`. If you use DyModel's createTable() from a Joi schema then you will not need to call `describeTable()`.

---

## `setGlobalOptions(options)`

Sets the global options for the main DynaDoc object. These options are passed onto every DynaClient created.

```javascript
/**
A function for setting global options for DynaDoc. Options include:
TablePrefix <String>: A table prefix string that is applied to every
     table created by any client made.
UseTLS1 <Boolean>: [Default: false]: Boolean that determines if DynaDoc dynamoDB
     document client will be created to minimize the affects of ERPROTO issue with
     Node.js and DynamoDB. This option will be removed later once Node.js and
     AWS has resolved the ERPROTO issue with using TLS version higher than 1.
**/
var AWS = require('aws-sdk')
/*
Here you may need to include Secrete keys if running outside of EC2.
Otherwise you can assign a DynamoDB role to EC2 instances.
*/
AWS.config.update({
    "accessKeyId": "<Your_AWS_USER_ACCESS_KEY_ID>",
    "secretAccessKey": "<YOUR_AWS_USER_SECRET_ACCESS_KEY>",
    "region": "<AWS_REGION_CODE>"
});
var DynaDoc = require('dynadoc').setup(AWS);

//DynaDoc is now ready to use everywhere it is required!
DynaDoc.setGlobalOptions({
    "TablePrefix": "GlobalTablePrefix-",
    "UseTLSV1": true
});
/*
Every DynaDoc client now will make a table/access a table with "GlobalTablePrefix-"
as its prefix.

UseTLSV1 will force DynamoDB Document client to connect to DynamoDB via TLSv1.
This is the current patch for the common write ERPROTO when using aws-sdk with
a node version other than 0.12.9 or 0.12.9
*/
```

---
## `removeGlobalOption(optionName)`

Removes a global option from DynaDoc. Use this if you only want certain
dynaClients to have a global option. Once a DynaClient is created, then the
global options stay with that DynaClient for its entire life cycle (you cannot
safely remove them). This funciton removes deletes the option from the Global
DynaDoc options object.

```javascript
/**
Remove a global option from DynaDoc.
Return true if the option was found and removed.
False if the option was not found.
**/
//Assuming we used the setup from the setGlobalOptions() method above.
DynaDoc.removeGlobalOption("TablePrefix");
//New DynaClients created will not use the TablePrefix.
```

---

## `getGlobalOption(optionName)`

Returns the value of the current global options passed in. Returns null if the
option is not found.

```javascript
/**
Returns the value of a global option given its name.
**/
//Assuming DynaDoc is setup properly.
if (DynaDoc.getGlobalOption("UseTLSV1")) {
    //If we are using TLSV1 then do something.
    console.log('DynaDoc is using TLSv1 to limit ERPROTO errors.');
}
```

---

## `hasGlobalOption(optionName)`

Returns `true` if DynaDoc has an option with the given name, `false` if the options is
not found.

```javascript
/**
Checks if DynaDoc has a global options set or not.
Return true if the option exists and false otherwise.
**/
//Assuming DynaDoc is setup properly.
if (DynaDoc.hasGlobalOption("TablePrefix")) {
    //If we are using a table prefix then do something.
    console.log('DynaDoc is using a table prefix. The prefix is: ' + DynaDoc.getGlobalOption("TablePrefix"));
}
```

## `createClient()`

Creates a new DynaClient. This is the actual client that will make DynaDoc calls
to DynamoDB table. It is recommended that you create a new client for each table
you are interacting with.

```javascript
/*
Setup must be called before createClient. It only needs to be called once with
a valid AWS object.
*/
var DynaDoc = require('dynadoc').setup(AWS);
/**
Factory function. By creating a new one, you can simply
use the DynamoDB DocumentClient from the AWS SDK attatched as
Table1.dynamoDoc
You can call describeTable at any time to update DynaDoc's
description of the table.
@param tableName (String): The string name of the table to parse.
@param model (Object): Joi schema that represents the Table Object. [Optional]
@param readThroughput (integer): The number of read unites for this table.  [Optional]
@param writeThroughput (integer): The number of write units for this table. [Optional]

@returns DynaClient (Object): The client for communicating with this table.
**/

//dynaClient is a new client for the TableName provided.
var Table1 = DynaDoc.createClient('<YourTableName>');
```

createClient will create a new DynaClient for the specific table.

---

## `describeTable()`

This is an important method as it allows DynaDoc to be smart. DynaDoc will always parse the
result of this call and update its settings object. You can potentially change tables by calling this method
(It is recommended to create a separate dynaClient object for each table). This call should only be called
immediately after the dynaClient is created.

```javascript
/**
Function will make a call to get details about a table.

@param TableName : The Name of the DynamoDB table to query.
**/

//This returns the DynamoDB table description.
var tableDescription = Table1.describeTable('TableName');
```

---

## `query(indexName, hashValue, options)`

Smart Query is the first smart function of DynaDoc. smartQuery is fairly versitile and capable of handling a lot of different situations. SmartQuery returns a raw DynamoDB response. The items you have found would be under 'Items' key and the total number found is under the key of 'Count'.

RangeValue is an option which supplies a RangeValue for the query. (If the index requires it).
Action: Is the logic operator that will be applied to the RangeValue (Default is '=')
  - Action: "= | < | > | <= | >=" (Any option for the KeyConditionExpression)

  Check the DynamoDB Document Client for more options: http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html


Example Response:
```
{
   "Items": [{"ItemValue": 0}],
   "Count": 1,
   "ScannedCount": 1
}
```

Example Code:

```javascript
/**
 Function that automatically generates the necessary restful information for the
 Table in order to make requests to DynamoDB. This function makes it easier for
 developers to work with DynamoDB by giving them simple functions to query their
 tables.

 DevNote: To use SmartQuery on a Primary Index you should pass in the
PRIMARY_INDEX_NAME to the method. IE. Table1.PRIMARY_INDEX_NAME //Is the name of the primary index.

 Requires: Smart functions to be enabled after the tableDescription or createTable() is filled out and called.

 @param indexName: (String) The index name (typically ending in '-index')
 @param hashValue: The value for the hash in whatever datatype the index hash is in.
 @param rangeValue: The range value for the index to compare or search for. (Required if Index Requires it)
 @param action: An action to take on the Range value. Examples: "<", "=", ">=", etc. (Optional, Default: '=')
 @param options (Object): Additional Options for query found in the AWS SDK. (Optional, Default: null)

 @returns promise: Result of the query to DynamoDB.
**/
//A full body request with everything in it.
var smartQueryResult = yield Table1.query(
    "GlobalSecondary-index", //IndexName
    "GlobalHash",            //PrimaryHash Value         
    {                        //RangeValue, Action, and Additional options as defined by the AWS-SDK
        "RangeValue": "GlobalRangeValue", //PrimaryRange Value
        "Action": "<",                     //Comparative action for the range value. Defaults to "="
       "ReturnConsumedCapacity": "TOTAL",
       "ScanIndexForward": false,
       "Limit": 10
    });

//Same query as above but without the additional params option.
var response = yield Table1.query("GlobalSecondary-index","GlobalHash", {RangeValue: "GlobalRangeValue", Action: ">"});

//A request that does not use a limit or define an action (limit is 10 by default, action is '=')
response = yield Table1.query("LocalSecondaryIndex-index","PrimaryHashTest", {RangeValue: "SecondaryIndex"});

/*
A request on the 'PrimaryIndex'. Use the PRIMARY_INDEX_NAME value attached to the dynaClient.
*/
response = yield Table1.query(Table1.PRIMARY_INDEX_NAME,"PrimaryHashTest", {RangeValue: 1});

```

## `between(indexName, hashValue, lowerRangeValue, upperRangeValue, options)`

Between is an extension of query that allows indexes that support numeric Range values to use the BETWEEN
option. The BETWEEN option will query a range of two values. It is always inclusive (required from AWS-SDK).


Example Response:
```
{
   "Items": [{"ItemValue": 0}],
   "Count": 1,
   "ScannedCount": 1
}
```

Example Code:
```javascript
/**
 The smart query Between call. Will return items from the indexName that are
 between the given lowerRangeValue and the upperRangeValue.
 You can pass in an Integer to limit the number of items that are returned.

 @param indexName: (String) The index name (typically ending in '-index')
 @param hashValue: The value for the hash in whatever datatype the index hash is in.
 @param lowerRangeValue: The lower range value for the index to compare or search for.
 @param upperRangeValue: The upper range value for the BETWEEN query.
 @param options (Object): Additional options for smartBetween.
        - Limit (Integer): Limit the number of documents to return (optional, Default = 10);
        - Other AWS Options like ScanIndexForward and ReturnConsumedCapacity, etc.
**/

//A BETWEEN call to pull Range values between 0 and 10 inclusively and limit results to 5 documents.
var response = yield Table1.between("CustomerID-Date-index","Test1", 0, 10, {Limit: 5);

//The same call as above, but using the Primary Index for the current table.
response = yield Table1.between(Table1.PRIMARY_INDEX_NAME,"Test1", 0, 10, {Limit: 5});
```

## `batchGet(arrayOfTableNames, batchGetKeyObject, options)`

BatchGet allows for multiple documents to be returned from an array of objects containing hash and range values. This call does not require Describe Table, but instead relies on you to pass an array of TableNames that are used to map each additional arrays of hash and range value objects to get.


Example Response:
```
{
   "Responses": {
       "TableName1": [{
           "ItemValue": 0
        }],
        "TableName2":[{
            "ItemValue": 32
        }]
    },
   "UnprocessedKeys":[<Contains Objects that were requested, but were not retrieved for some reason known to DynamoDB>]
}
```

Example Code:
```javascript
/**
Makes a request to DynamoDB to batchGet several items at one time. Takes an
array of TableNames and an object that is mapping TableName to an array of
object keys to retrieve from the database.

@params arrayOfTableNames (Array<String>): An array of table names that items
will be added to.
@params batchGetKeyObject (Object): An object that maps table names to arrays of
key objects that will be used to retrieve items from DynamoDB Table. This file
has the following structure:
{
    '<TableName>':[
        {'<HashKey>':'<HashValue>',
        '<RangeKey>':'<RangeValue>'}, (Repeating for each item to retrieve)
    ],(Repeating for Each Table)
}
**/

var response = yield Table1.batchGet(['<TableName>'],
{
 '<TableName>': [{
    '<PrimaryHash>':'<PrimaryHashValue>',
    '<PrimaryRange>':'<PrimaryRangeValue>'
  }]
}, {
    "ScanIndexForward": true
});

```

## `batchWrite(arrayOfTablenames, options)`

BatchWrite allows you to put and/or delete items from a table in batches. The function takes an array of Table names that are used to map arrays within the two other params to the tables. The 2nd parameter is an Object with keys of TableNames and values of arrays of objects containing the items you want to put into the table. The 3rd parameter is an object with keys of TableNames and values of an array of objects that contain the hash and range keys-value pairs to delete from the table. Both the 2nd and 3rd (Put and Delete Objects) are optional, but one must be provided or DynamoDB will throw a validation error.

BatchWrite will not return more unless DynaDoc settings for ReturnValues is set.
Example Response:
```
{
   "UnprocessedItems": [<Contains Objects that were requested, but were not retrieved for some reason known to DynamoDB>]
}
```

Example Code:
```javascript
/**
This function will create the smart payload given the following
params and send it to DynamoDB. This function supports both PutRequest and
DeleteRequest. You must pass seperate objects in as parameters for PutRequests
and DeleteRequest. Make sure that table names match the object keys.

@param arrayOfTableNames (Array): Array of the table names that will be
  affected.

@param options (Object; Optional): The DynamoDB options for a batchWrite call.
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'

    - DeleteItemsObject (Object): An object whos keys are TableNames and values
    are arrays of key objects of documents that should be removed from that table.
    The object structure is identical to putItemObject, but the items inside the
    array should only have the Hash and Range key-values if applicable.

    - PutItemsObject (Object): An object whos Keys are tableNames and values
       are arrays of objects to put into each table.

       putItemsObject = {
       <TableName1>:[{<DocumentToPut},{<DocumentToPut},{<DocumentToPut}, etc...],
       <TableName2>:[{<DocumentToPut},{<DocumentToPut},{<DocumentToPut}, etc...],
    }
**/
//Some examples for the parameters and how they can be created.
var tableArray = ["Table1Name", "Table2Name"];

//Create the putItemsObject.
var putItemsObject = {};
            putItemsObject["Table1Name"] = [{'PrimaryHash': 'hansks928ks'},{'PrimaryHash': '2jjd92a3fa9'}];
            putItemsObject["Table2Name"] = [{'PrimaryHash': 55, 'PrimaryRange': 22}];

//Create the deleteItemsObject.
var deleteItemsObject = {};
deleteItemsObject["Table2Name"] = [{'PrimaryHash': 98, 'PrimaryRange': 32}];

//Now use the parameters to make the dynaClient call.
var response = yield Table1.batchWrite(tableArray, {
  "PutItemsObject": putItemsObject,
  "DeleteItemsObject": deleteItemObject,
  "ReturnConsumedCapacity":"TOTAL"
});
```

---

# `DynaDoc Dynamo DocumentClient Promise API`

DynaDoc has promisfied several of the AWS-SDK DocumentClient methods. They function identically to the AWS-SDK, but they now return promises (callbacks before). This was done by using bluebird promisefyAll() method. You can access these methods from the dynaclient object.

```javascript
//Accessing DynamoDB DocumentClient API via DynaDoc Client.
var response = yield Table1.dynamoDoc.getAsync(params);

//or via a callback.
Table1.dynamoDoc.get(params, function(err, res) {
  if (err) {
    throw err;
  }
  console.log('Success!');
});

/**
Query call on a dynamoDB table. Query a index of some sort.
@param params: The completed call object for the DynamoDB Document Client Query API.
**/

//The params object is the necessary Query params from the AWS-SDK DynamoDB DocumentClient.
var response = yield Table1.dynamoDoc.queryAsync(params);
```

## `putItem(item, options)`

```javascript
/**
Promisfied Put Item API call.
The item must have the primary key (and Range key if applicable) already inside it
otherwise DyanmoDB will throw an error.

@param document (Object): The object add to the DynamoDB table (should include all necessary keys).

@param options (Object; Optional): The DynamoDB options for a putItem call.
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
**/

//Put an item into the DynamoDB table. The result of the query is put into the putResult object.
var response = yield Table1.putItem({"PrimaryID":5423,"RangeID":23,"data":"MyData"}, {"ReturnValues":"ALL_OLD"});
```

## `getItem(key)`

```javascript
/**
Get the item with Key value passed in.

@param Key: Should be an object, that represents the following structure.
{"PrimeKeyName":"MyHashKey"}
PrimeKeyName is the name of the primary key field in the DynamoDB table.
MyHashKey is the actual key to search the table for.
**/

//Put an item into the DynamoDB table. The result of the query is put into the putResult object.
var response = yield Table1.getItem({"PrimaryID":5423,"RangeID":23});
```


## `queryOne(indexName, keyConditionExpression, expressionAttributeValues, expressionAttributeNames)`

```javascript
/**
Query call that only takes the three main arguments.
Simple assistant so the user does not have to make the payload for themselves.

 @param indexName: (String) The name of the Index that this query will search through.
 @param keyConditionExpression: (String)The Condition expression that is used to search through the index.
  Examples:
  "#hashKey = :hashkey and #rangeKey > :rangeKey"
  "#hashKey = :hashkey and #rangeKey = :rangeKey"
  "#hashKey = :hashkey"

 @param expressionAttributeValues: (Object) Key: Variable name in key Condition Expression, Value: The value of the variable.
 @param expressionAttributeNames: (Object) Key: Hash Variable name in the key Condition Expression, Value: The Name of the Hash attribute

This method is not intelligent and requires the user to provide each structure of the call.
use smartQuery() to use DynaDoc's intelligent system.
**/
//Example query for queryOne.
var response = yield Table1.queryOne("SimpleIndex-index", "#tkey = :hkey", {":hkey":"2015-08-11T21:32:34.338Z"}, {"#tkey":"Timestamp"});
```

## `deleteItem(key, options)`

```javascript
/**
Delete an item from the Table.
 @param key: (Object) Keyvalue for Primary Hash and Range Hash.

@param options (Object; Optional): The DynamoDB options for a deleteItem call.
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
**/

//The item with PrimaryHash 5423 and Range of 23 will be removed from the table.
var response = yield Table1.deleteItem({"PrimaryID":5423,"RangeID":23});
```

## `updateItem(params)`

```javascript
/**
Update an item in the DynamoDB table.
@param params: (Object) Follow the
Example update params. This was taken directly from the AWS SDK DocumentClient Example.
All credit to AWS for the below example.
var params = {
  TableName: 'Table',
  Key: { HashKey : 'hashkey' },
  UpdateExpression: 'set #a = :x + :y',
  ConditionExpression: '#a < :MAX',
  ExpressionAttributeNames: {'#a' : 'Sum'},
  ExpressionAttributeValues: {
    ':x' : 20,
    ':y' : 45,
    ':MAX' : 100,
  }
};

**/

//params is the update object similar to the one above.
var response = yield Table1.updateItem(params);
```

## `setSettings(userSettings)`

Sets a few specific settings in the payload for DynamoDB. This method does not give you access to the payloads or the ability to dynamically add fields to the payload. The settings set here are the default items that are sent with every request.

```javascript
/**
Settings for the DynaDoc client to use.

This method does not change the TableName attribute.
In order to change the TableName you will need to either create a
new DynaDoc object or call describeTable with the new TableName.

This ensures that settings are not confused (would cause problems for
the smart query).

Options:
ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
ReturnItemCollectionMetrics: 'SIZE' | 'NONE'

@param userSettings: (Object) Specifies any setting that you want to set for every DynamoDB API call.

@returns DynaClient (this): Builder style call.
**/

//This will tell DynamoDB that you want all older return values from updates & puts.
Table1.setSettings({"ReturnValues":"ALL_OLD"});
```


## `getTableName()`

Simply returns the string table name of this DynaDoc client table (what the table is called in DynamoDB). Synchronous.

```javascript
var tableName = Table1.getTableName();
```

## `printSettings()`

Prints the dynaClient settings to the console. Used for debugging dynadoc or error reporting.

```javascript
Table1.printSettings();
//the settings will be pretty printed to the console.
```


---

# `DyModel`

DyModel is an extension to DynaDoc to enable Model and Schema support. DyModel allows DynaDoc to use a schema created by you via Joi to in turn create a DynamoDB table representing that schema. The DyModel object also exposes Joi validation methods so that objects can be validated against the provided table schema.

DyModel is the most **recommended** way to use DynaDoc as it does not require a describeTable() call. The Joi schema you provide along with what indexes you want to create will provide all that DynaDoc needs.



## `Getting Started`

DyModel is used to represent what a table should look like in DynamoDB. DyModel is reliant upon the Joi validation library. A Joi schema is parsed and used to create a DynamoDB table.

It is recommended that you create a single DynaDoc instance and export it as a module for other DynaDoc models to reference.

```javascript
//File: DynaDoc.js
//Requires the AWS-SDK
var AWS = require('aws-sdk');

/*
Here you may need to include Secrete keys if running outside of EC2.
Otherwise you can assign a DynamoDB role to EC2 instances.
*/
AWS.config.update({
    "accessKeyId": "<Your_AWS_USER_ACCESS_KEY_ID>",
    "secretAccessKey": "<YOUR_AWS_USER_SECRET_ACCESS_KEY>",
    "region": "<AWS_REGION_CODE>"
});
//You only need to require setup(AWS) once, then each require after that will use the same DynaDoc object.
var DynaDoc = require('dynadoc').setup(AWS);

module.exports = DynaDoc;

```

If the below code was in a file called dynaTable1.js, the DynaDoc client and model could be exported and required wherever this specific client is needed.

```javascript
//File: dynaTable1.js

//Require the DynaDoc object from the above example.
var DynaDoc = require('./DynaDoc');
//The Joi library exposed for convience.
var Joi = DynaDoc.getJoi();

//Using Joi you can create a schema
var testSchema = Joi.object().keys({
    "PrimaryHashKey": Joi.string(),
    "PrimaryRangeKey": Joi.number().integer(),
    "GlobalSecondaryRange": Joi.string(),
    "GlobalSecondaryHash": Joi.string(),
    "LocalSecondaryIndex": Joi.string(),
    "timestamp": Joi.array().items({
        "time": Joi.date(),
        "value": Joi.number().integer()
    })
});

//This creates a new DynaDoc Client that contains a model (15 and 13 are default table read and write throughput)
var dynaTable1 = DynaDoc.createClient("MyNewTable", testSchema, {"ReadCapacityUnits": 15, "WriteCapacityUnits": 13});

/*
For any schema, you must specify which key is the primary key and if there is a range key (leave out if no rang key).
Note: each ensure method returns the client object (builder methdology). These calls are synchronous and chainable.
*/
dynaTable1.primaryIndex("PrimaryHashKey", "PrimaryRangeKey");

//This tells DynaDoc that the item GlobalSecondaryHash is a new Global Index.
//         IndexName (As it will appear in DynamoDB), Index Hash Name (from schema), Range Name, read, write,
.globalIndex(
  "GlobalIndex-index",
  "GlobalSecondaryHash",
  {
    "RangeValue": "GlobalSecondaryRange",
    "ReadCapacityUnits": 5,
    "WriteCapacityUnits": 7
  }
);

//Create a local index (Always share primary Hash Key):
//Params: IndexName, The Key Value to use for the range key in the model above.
dynaTable1.localIndex("LocalIndexRange-index", "LocalSecondaryIndex");

/*
Create the schema in the table. The param is a boolean to ignore and not create a new table if it already exists.
This is an async call (DynamoDB returns instantly). DynaDoc does not hold a lock or anything. It is currently
your responsibility to ensure that the table is active (not in the creating state) before making other
calls to the DynamoDB table. DynaDoc provides a isTableActive() method that will return the status of
the table as a boolean (True if active, false otherwise).
*/
dynaTable1.createTable(true).then(function(res) {
  /*
  Call was successfull. It could take a minute or two for your table to be ready...
  DynaDoc does not handle this. However, once the tables are created, from the schema
  then they will not be created again and you can instantly use DynaDoc like normal! :)
  IE. You will have to find a clever way to wait for the table to be created the first time.
  */
  console.log("Table has begun creation.");
}); //Returns a promise with response from DynamoDB

/*
Now anywhere this file is required, it will represent the DynaDoc client for this table.
With all the DyModel features enabled.
*/
module.exports = dynaTable1;
```

Now everwhere you require the model in file dynaTable1.js you will get that object with its schema and table. You can then use the standard DynaDoc API as well as use validation methods for the schema.

---

## `DyModel Methods`

Below is a list of methods for the DyModel API.

### `primaryIndex(hashKey, rangeKey)`

Adds the given keys to the tablePayload as the primary index keys for the table.
This must be the first index method called for your model (best practice). Hash keys are taken from the Joi schema keys passed in during the createClient() method.

```javascript
/**
Create the primary Index. You must call this and call it first!
@param hashKey (String): The name of your hashkey in your Joi model.
@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
**/
Table1.primaryIndex("<MyHashKeyName>", "<MyRangeKeyName>");
```
---

### `globalIndex(indexName, hashkey, options)`

Adds a global index for the given arguments to the tablePayload. If createTable() has not yet been called on this table, then this method will prepare the index for the createTable() method. If createTable() method was already called, then this will prepare the index to be added after the table creation. IE. You can then use updateTable() to create the index (note that this may take additional time, even several minutes).

```javascript
/**
Adds a global index to the table Payload.
@param indexName (String; Optional): The name that you want to refer to this index as.
@param hashKey (String): The name of your hashkey in your Joi model.
@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
@param readCapacity (Integer): Read throughput for DynamoDB index.
@param writeCapacity (Integer): The write throughput for DynamoDB index.
@param options (Object; Optional): Additional options for this specific index. Options Include:
   - ProjectionType: KEYS_ONLY | INCLUDE | ALL
   - NonKeyAttributes: Array of Strings when Project is INCLUDE.
       Strings are the attribute names to project into the index.
**/
Table1.globalIndex("<MyIndexName>", "<MyGlobalHashKeyName>", "<MyGlobalRangeKeyName>", 10, 11, {"ProjectionType": "ALL");
```
---

### `updateGlobalIndex(indexName, readCapacity, writeCapacity)`

Function to update the throughput of a global index. This adds the necessary details to the tablePayload, but you must still call updateTable() to push the changes to the table.

```javascript
/**
Update the read and write capacity of an index.
Adds the update object to the GlobalIndex TablePayload for the update call.
You will still need to call updateTable() and wait for the table to be
active.
@param indexName (String): The name of the index in DynamoDB.
@param readCapacity (integer): The new set provisioned read throughput for this index.
@param writeCapacity (integer): The new set provisioned write throughput for this index.
**/

//Update the global index read and write capacity.
Table1.updateGlobalIndex("<MyGlobalIndexName>", 5, 4);
Table1.updateTable().then(function(res) {
  //the table will enter the UPDATEING STATE. This index will not be useable while it is being updated.
  console.log('Success updating the table.');
  /*
  You must wait until the table is out of the UPDATEING state to use this index.
  This function is asynchronous, so you muse use isTableActive() to determine when the table
  becomes active again.
  */
});
```
---

### `deleteIndex(indexName)`

This function will delete the given global index name from the DynamoDB table. This function will create the necessary information for the deletion and add it to the tablePayload object. You will need to call updateTable() in order to push the table changes.

```javascript
/**
Delete a global index.
This modifies the table Payload. updateTable will need to be called
before changes can take affect.
@param indexName (String): Name of the index to delete.
**/
Table1.deleteIndex("<MyGlobalIndexName>");
```

### `localIndex(indexName, rangeKey, options)`

Adds a local index with the given name and range key exists in the table. Only works with create table. Update table does not work as you cannot update a local index after it is created. Provisioned throughput is consumed through the tables capacity.

```javascript
/**
Adds a secondary local index to the table payload.
created. The hashKey is always the primary hash key. This means that the primary
index must be ensured before any local indexes.

@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
@param indexName (String): The name you want to refer to this index as.
@param options (Object; Optional): Additional options for this specific index. Options Include:
   - ProjectionType: KEYS_ONLY | INCLUDE | ALL
   - NonKeyAttributes: Array of Strings when Project is INCLUDE.
       Strings are the attribute names to project into the index.
**/
Table1.localIndex("<LocalIndexName>", "<MyRangeKeyName>", {"ProjectType": "INCLUDE", "NonKeyAttributes":["timestamp"]);
```
---

### `setTableThroughput(readCapacity, writeCapacity)`

Adds the new table throughput to the tablePayload object. You must call updateTable() to make changes to the DynamoDB table (See updateTable() for details).

```javascript
/**
@param readThroughput (integer): Sets the read throughput for the table payload.
@param writeThroughput (integer): Sets the write throughput for the table payload.
**/
//Creates the throughput object as 10 and 15 for read and write capacity.
Table1.setTableThroughput(10, 15);
```
---

### `getThroughput()`

Returns the current tableThroughput for the DynaDoc client object. This does not query the table, but uses what is stored locally.

```javascript
var throughputObject = Table1.getThroughput();
//Prints out the read and write throughput.
console.log('The Read throughput is: ' + throughputObject.ReadCapacityUnits);
console.log('The Write throughput is: ' + throughputObject.WriteCapacityUnits
```
---

### `setMaxThroughput(max)`

Simply sets the max possible throughput for the table. Neither read nor write will be able to go above this limit.

```javascript
/**
Set the max throughput for the given table.
**/
//Table1 throughput cannot exceed 100 read and write capacity. IE. setTableThroughput(200) would throw an error.
Table1.setMaxThroughput(100);
```

### `setDynamoStreams(streamEnabled, streamType)`


Adds StreamSpecification to the table payload. Can be used in createTable or
updateTable. You must call createTable or updateTable for these changes to take
effect. You CANNOT update table IOPs in any manner and also update the streams
in the same call. You must seperate the two updateTable() calls. This is a requirement
by DynamoDB.

Note: You will receive a ResourceInUseException if you attempt to enable a
stream on a table that already has a stream, or if you attempt to disable a
stream on a table which does not have a stream (once you call createTable() or
updateTable()).

```javascript
/**
Adds StreamSpecification to the table payload. Can be used in createTable or
updateTable. You must call createTable or updateTable for these changes to take
effect. You CANNOT update table IOPs in any manner and also update the streams
in the same call. You must seperate the two updateTable() calls. This is a requirement
by DynamoDB.

Note: You will receive a ResourceInUseException if you attempt to enable a
stream on a table that already has a stream, or if you attempt to disable a
stream on a table which does not have a stream (once you call createTable() or
updateTable()). DynaDoc throws an error before the updateTable() calls
dynamoDB

@params streamEnabled (boolean): True to enable streams, false to disable.
@params streamType (String): The type of stream this table will provide.
   - options are (choose one): 'NEW_IMAGE | OLD_IMAGE | NEW_AND_OLD_IMAGES | KEYS_ONLY'
@returns this DynaClient (builder model)

@throws: Error if you attempt to adjust table or index IOPs in the same updateTable() call.
**/
//This will enable streams with type of NEW_IMAGE
Table1.setDynamoStreams(true, 'NEW_IMAGE');
//You can call updateTable() immediately for the changes to take effect.
//DynamoDB update calls are asynchronous, you must use a table Active
//to know when the table is done.
Table1.updateTable().then(function(res){console.log('Successful, Update pending completion...')});
```

### `isTableActive()`

Checks if the table is in the active state.

```javascript
/**
@returns promise: resolves to a boolean: True if the table is active, false otherwise.
**/
Table1.isTableActive().then(function(res) {
  if (res) {
    //The table is active...
  }
});
```
---

### `createTable(ignoreAlreadyExists)`

After you have called all the index methods that you would like (or setThroughput methods), you can call createTable to try and create the table. If the table already exists, an error is thrown and a new table is not created. If the table does not exist, the method should create your table and will return immediately. It will be up to you to ensure that you do not make any calls to the table until it is in the active state. The amount of time it will take is dependent upon the size of table throughput you are requesting. You can use isTableActive() to figure out if a table is active.

```javascript
/**
REQUIRED
Given this model, create the table. This function will create the DynamoDB table that
this model represents.

DynamoDB will create the table Asynchronously. You must wait for the table
to go from inactive states to active states (IE. from Creating, to Active).
DynaDoc does not currently do this. We give you a function to check if the
table is ready. Table1.isTableActive();

If the table already exists a "ResourceInUseException" will be thrown.
You can check this by catching the error and looking at the "code" property.

@param ignoreAlreadyExist (Boolean): True if you want to ignore already exist errors, false otherwise.
**/
//Ignores already created errors.
Table1.createTable(true).then(function(res) {
    /*
    DynamoDB is asynchronous and returns immediately.
    You cannot use the table until it is completed,
    which may take several minutes after this call.
    IE. it is best to run DynaDoc, create your tables, manually wait,
    and once the table is finished being created, you are
    ready to use DynaDoc immediately.
    */
    console.log('Table Creation is started!');
});
```
---

### `updateTable()`

Given the previous index methods and set throughput methods, this function will push all the new updates to the table. If the table is already not in an active state then this method will throw the error. This method will return a promise  immediately. Once updateTable() is called, then the pending changes from other DynaDoc methods will be pushed to the table. The table will enter the Updating state. No further changes can be made until the table returns to the active state (typically anything not using the indexes being updated will still be functional).  It is your responsibility to ensure that the table is in an active state before making any calls to it (otherwise you will get errors).

You must call describeTable() once the table returns to the active state in order to use the index or to know if it was deleted. It is highly discourage to use this method to update anything other than provisioned throughput for indexes and tables. It is recommended that you do manual addition and deletion of indexes once the table has been created. Otherwise, delete the table, and reconstruct it with the new indexes and parameters if you don't care about the data in the old table.

```javascript
/**
Given the current PayloadObject, update the table.

After a table update (once the table is updated and has entered the Active state), you must call describeTable() again.
If you do not call describe table, DynaDoc may not know about the new index you have added or deleted and
will not be able to use it.
**/
Table1.updateTable().then(function(res) {
  //Imeditaly returns with success, though the DynamoDB table will be unavailable if updating.
  console.log('Success in updating the dynamoDB table!');
}).catch(function(err) {
  console.error('Failed to update the table.');
  throw err;
});
```
---


### `getTablePayload()`

Returns the current tablePayload. This is the object that will be sent to DynamoDB after either the createTable() or updateTable() methods are called.

```javascript
var tablePayload = Table1.getTablePayload();
//This will print the table payload to the console.
console.log(JSON.stringify(tablePayload, null, 4));
```

### `resetTablePayload()`

Resets the table payload and starts the client clean. This should not be used unless you want to ensure that a tablePayload is empty (IE. after calling createTable() or updateTable()). DynaDoc should call this on its own, but you may have a use case for when you want to clear the table Payload. this does not clear out any model info or settings.

```javascript
/**
Reinitializes the DyModel object.
IF this is called again, the object is wiped and must be re-established.
**/
Table1.resetTablePayload();
//The tablePayload is now an empty object.
```

---
### `toSimpleObject()`

Returns the DynaClient object as a smaller human friendly object. Good for simple debugging or sanity checks.

```javascript
//Prints the DynaClient object to the console.
console.log( JSON.stringify( Table1.toSimpleObject(), null, 4));
```

---

## `buildUpdate(newObject, options)`

Creates a new buildUpdate builder which can then build a DynamoDB update query. The newObject is taken in and referenced to update DynamoDB. You reference new values to update in the newObject by its key. DynaDoc will then build the necessary payload to update the dynamoDB document with the new key/value (once you call send()).

```javascript
/**
Creates a new SmartUpdate object that the user can then build their smart
payload with. Utilizes the new UpdateExpression attribute for DynamoDB.
Every call returns the SmartUpdate object to allow for chaining.

This method requires that the DyModel procedure is used.

@param newObject (Object): The update object that will be used to update the item.
    Note that not all fields in this object will be used to update the item.
@param options (Object): Standard update options for DynamoDB.
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
**/
/*
The object we will use to update DynamoDB table document.
In this case CustomerID is the primary hash key (no range key).
Note: That though we pass this in, only fields which we apply
builder functions too will be used. Other fields are ignored.
*/
var newObject = {
   "CustomerID": "Test5",
   "updateValue": updateValue,
   "timestamp": [{
   "time": "2015-08-11T21:31:45.449Z",
        "value": timeStampValue
   }],
   "updateSet": dynaTable2.createSet([4, 3, 2, 1]),
   "newList": [1, 2, 3, 4],
   "newValue": 22
};


//Create a new builder for the object.
var builder = Table1.buildUpdate(newObject, {
   "ReturnValues": "ALL_NEW"
});
/*
Add updateValue to the current table 'updateValue' set a newValue to 22,
and append the whole timestamp array to the front of what is in the DynamoDB table.
*/
builder.add('updateValue').set('newValue').set('timestamp', {AppendToFront: true});
//.send() returns a promise for the updateItem response from DynamoDB table.
builder.send().then(function(res) { console.log("Update Success! " + res);});
```

The updateBuilder functionality is very powerful and is a future that will be continually developed. Below are the current list of features and functions available for users.

### `add(key, options)`

The add function follows the AWS specification for ADD action in the updateExpression. This is best used with integer values and sets (not lists!). You should visit the AWS documentation for the updateExpression feature for more information: [AWS UpdateExpression Actions](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.Modifying.html#Expressions.Modifying.UpdateExpressions.ADD)  

### `set(key, options)`

Set is probably the most diverse action for DynaDoc. It allows you to set an integer and/or list items as well as sets.

A simple example to push a single attribute
```javascript
/*
Sets the field integerField in the newObject passed in (IE.Prepares that
field to be pushed to the database). After this call the database will
eventually (unless you have strong consistency set on the table) be
integerField: 22
*/
var builder = Table1.buildUpdate({integerField: 22});
var result = yield builder.set('integerField').send();
```

Set has several options to better handle list data types.

```javascript
/*
Creates a new smart Update builder with the an object with a newList key/value.
Sets the new list to be created if it does not already exist. If it does already exist,
then nothing new is done.
Other options:
    -IgnoreMissing: If true, ignores if an action is taken on a key and the
       key is not present. Default: false
    - AppendToFront: true | false   [Defaul: false] : Append the given values
     to the front of a list.
    - Index (integer): The index that the value in the array will replace.
    - setIfNotExist (Boolean): True to use if_not_exists() method. Overrides
       AppendToFront Option. If it already exists, no change is made to the database.

*/
var updatedItem = yield Table1.buildUpdate({newList: [2]}).set("newList", {IfNotExist: true}).send();


/*
Appends to the front the value of 4 onto the newList item previously made and
pushes it to the database table. If the AppendToFront option is not provided,
then the item is always added to the end of the list.
*/
updatedItem = yield Table1.buildUpdate({newList: [4]})
   .set('timestamp', {
      AppendToFront: true
   })
   .send();

```

To set Items which are not lists, you simply reference them as you would a list with options you want.
```javascript
//Create a new builder object with the given object.
var builder = Table1.buildUpdate({"myString": "hello", "otherString": "yes", "numberValue": 5});

//This tells the builder to use the myString and numberValue in the update payload.
builder.set('myString').set("numberValue");

//send() returns a Q promise to the DynamoDB response.
builder.send().then(function(res) {
   console.log('The dynamoDB response to the update: ' + res);
}, function(err){console.log(err)});
```

### `setList(key, options)`

Update method for updating an array type value. set() will call setList() if the key/value you provide is an array for its value. The follow example is taken from above. Using set() on an array shoulf result in the same as if you were to use setList(). If you know that an key will always point to an array, then you can use setList().

```javascript
/**
Update builder method for updating a List (Array) type.

@param key (string): The name of the key for the newObject that the builder was initailzed with.
@param options (Object): A key value object with potential options listed below:
    -IgnoreMissing: If true, ignores if an action is taken on a key and the
       key is not present. Default: false
    - AppendToFront: true | false   [Defaul: false] : Append the given value
     to the front of a list.
    - Index (integer): The index that the value in the array will replace.
    - setIfNotExist (Boolean): True to use if_not_exists() method. Overrides
       AppendToFront Option. If it already exists, no change is made to the database.
**/
var updatedItem = yield Table1.buildUpdate({newList: [2]}).set("newList", {IfNotExist: true}).send();

```


### `remove(key, options)`

Remove is used to remove a key or element from a list. If you are utilizing DynamoDB sets then you will need to use deleteKey() instead of remove.

Basic Examples:

```javascript
/**
Remove items from a root Array/List.
If you are using a DynamoDB set object, you must use Delete to remove Items
from the set.

@param options (Object): Options to be used for the remove call.
   - LowerBounds (Integer): If the key is an array, you can specify what element to remove.
       This is the lower bounds (inclusive). Specify only this to delete one item.
   - UpperBounds (Integer): If the item is an array, you can speficy the upper bounds. All
       elements within the lower and upper bounds will be removed.
   -IgnoreMissing: If true, ignores if an action is taken on a key and the
              key is not present. Default: false
**/

var myItem = {
  test: "string",
  it: 23,  //Primary Hash Key
  NumberVal: 110 //Primary Range Key
};
//Build a new smart Update builder with myItem as the object to build from.
var builder = Table1.buildUpdate(myItem);
//Call remove to remove the test field from the object, and send() to commit it to the database.
builder.remove("test").send();

```

Remove has a few options to better support array types (lists).

```javascript
/**
Assume that DynamoDB is storing this "myItem" object in the database with
OldArray = [0, 1, 2, 3, 4, 5, 6];
it:  //Primary Hash Key
NumberVal: //Primary Range Key
**/
var myItem = {
  test: "string",
  it: 23,  
  NumberVal: 110,
  OldArray: []
};

//Build a new smart Update builder with myItem as the object to build from.
var builder1 = Table1.buildUpdate(myItem);

//Remove whatever item is in position 0 in the database OldArray attribute.
builder1.remove("OldArray", {LowerBounds: 0}).send();

var builder2 = Table1.buildUpdate(myItem);

//Remove every item in the OldArray attribute list between index 2(inclusive) and 4 (inclusive)
builder2.remove("OldArray", {LowerBounds: 2, UpperBounds: 4}).send();

//After the async call is successfully completed, OldArray should contain [1,5,6]
```


### `deleteSet(key, options)`

Delete an item from a set or the entire dynamoDB set itself. This function will not work on any datatype other than a DynamoDB set.

```javascript
/**
Delete a item from a set or the set itself. This does not work with anything
but DynamoDB sets.

@param options (Object): Options for a smartUpdate.
   -IgnoreMissing: If true, ignores if an action is taken on a key and the
       key is not present. Default: false
**/
/**
Assume that in Table1 of DynamoDB, there is an item like the following:
{
  'test': <DynamoDB Set Type>
}
**/
//We want to remove the 'test' set from the object.
var myItem = {
  'test': 'asdfwfa ---this string does not matter since we are deleting the whole set!',
  'value': 500
};
//This will remove the set from myItem in DynamoDB
var response = Table1.buildUpdate(myItem).deleteSet('test').send();

```


### `isLocked()`

Returns true or false if the builder has been locked and no more updates can be created. This happens after calling the compilePayload() or send() method. This method is not required, but is available incase a user needs it for something.

```javascript
/**
Returns if this payload has been compiled and locked yet.
**/
var builder = Table1.buildUpdate({"test": "updated"});
builder.compilePayload();
var payload = builder.getPayload();
if (builder.isLocked()) {
  //The payload is accurate and won't be changed by DynaDoc. Do stuff.
}
```

### `getPayload()`

Returns the table payload currently. Unless compilePayload() or send() is called, then this will return an empty object. The payload is an object containing all the necessary data to submit to DynamoDB.

```javascript
var builder = Table1.buildUpdate({"test": "updated"}).compilePayload();
var payload = builder.getPayload();
console.log('The payload generated by DynaDoc update builder is: ' + JSON.stringify(payload, null, 4));

```

### `compilePayload()`

This is mainly an internal function unless the user wants access to the payload object generated by the update builder. Once called, no further update operations can be carried out on the builder (it will be locked).

```javascript
/**
Finishes the payload and finalizes it.
Once this is called, the builder is locked and no further changes can be
made.
**/
var builder Table1.buildUpdate({"test": "ValidUpdate"});
//The payload object will be created and the builder will be locked.
builder.compilePayload();
```

### `send()`

This function will call compilePayload() and then send the payload to the DynamoDB table to update the object. This function will then return a promise which will contain the DynamoDB response.

```javascript
/**
  Update the test field, send off the payload to dynamoDB.
**/
var response = yield Table1.buildUpdate({"test": "NewData"}).set("test").send();
```

## `validate(object, options, callback)`

Joi method for validating an object against the DyModel Joi schema. This returns a JoiResult

```javascript
/**
The Joi Validate method against this DyModel object.
@param object (Object): The item to validate against this model.
@param options (object): Joi Options for validate.
@param callback (function): Function to callback from the Joi validation.
@return JoiResult (Object): Joi object that has both a error and value
  property. If error is defined, then there was an error. Value is the
  valid object.
**/
function validInputCallback(joiResult) {
  console.log('Callback for joi Result.');
}
var JoiResult = Table1.validate({'test': 3}, {}, validInputCallback);
```


## `assert(object, message)`

Throws any validation errors if the validation of the object against DyModel's Joi schema fails.

```javascript
/**
The Joi assert method. Throws validation error if validation fails.
Returns nothing.
@param object (Object): The item to validate against this model.
@param message (String):  Optional message to display if validation fails.
**/
Table1.assert({'test': 3}, 'Object failed to be validated.');
```

## `attempt(object, message)`

Throws errors if the validation fails and will also return the valid object if it passes.

```javascript
/**
The Joi attempt method. Throws validation error if validation fails.
Also returns the valid object.
@param object(Object): The item to validate against this model.
@param message (String):  Optional message to display if validation fails.
@return item (object): The valid object that passed validation.
**/
//test has a valid field, so validOjbect will contain {"test": "validValue"}
var validObject = Table1.attempt({"test": "validValue"}, 'Failed validation!');

//Since "test" value is not valid, then Joi will throw an validation error.
validObject = Table1.attempt({"test": 3}, 'Failed validation!');
```



## `Error Handling`

DynaDoc will throw errors that it encounters. If DynamoDB returns an error, it is throw from DynaDoc. If the AWS-SDK throws and error, it will be thrown up to you. DynaDoc currently does not catch nor suppress any errors (unless specified in a method parameter). DynaDoc does not do any validation against passed in parameters (though I may implement this later). It will be your responsibility to make sure that the data passed to DynamoDB is valid.

---

Thanks and please let me know how I can improve this tool! Open issues to request new features and bugs you have found. Please provide as much detail with reproducible test cases. Thanks in advanced!

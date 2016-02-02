# DynaDoc API

Below is the list of javascript API for DynaDoc. The API will primarily use comments from the source. This will also include an example of how it can be used.

##Error Handling##

DynaDoc will throw errors that it encounters. If DynamoDB returns an error, it is throw from DynaDoc. If the AWS-SDK throws and error, it will be thrown up to you. DynaDoc currently does not catch nor suppress any errors (unless specified in a method parameter). DynaDoc does not do any validation against passed in parameters (though I may implement this later). It will be your responsibility to make sure that the data passed to DynamoDB is valid.

---
##Factory##

```javascript
/*
Setup must be called before createClient. It only needs to be called once with
a valid AWS object.
*/
var DynaDoc = require('dynadoc').setup(AWS);
/**
Factory function. By creating a new one, you can simply
use the DynamoDB DocumentClient from the AWS SDK attatched as
TableClient1.dynamoDoc
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


##DynaDoc Functions ##

Easy functions are the heart of DynaDoc. They generate the payload and everything that is necessary to make a query to DynamoDB. In order to use these functions the describeTable() method must be finished first or you must setup the
a DyModel schema with Joi (Highly Recommended).

Before using functions please make the following call as soon as you create a dynaClient or table. If you use DyModel's createTable() from a Joi schema then you will not need to call describeTable.
```javascript
/**
 Describe a table to use smart Functions.
@param TableName (String): The name of the table for DynaDoc to use.
**/
TableClient1.describeTable('TableName');
```

---

#query()#

Smart Query is the first smart function of DynaDoc. smartQuery is fairly versitile and capable of handling a lot of different situations. SmartQuery returns a raw DynamoDB response. The items you have found would be under 'Items' key and the total number found is under the key of 'Count'.


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
PrimaryIndexName to the method. IE. TableClient1.PrimaryIndexName //Is the name of the primary index.

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
        "Action": "<",                     //Comparative action for the range value.
       "ReturnConsumedCapacity": "TOTAL",
       "ScanIndexForward": false,
       "Limit": 10
    });

//Same query as above but without the additional params option.
var response = yield Table1.query("GlobalSecondary-index","GlobalHash", {RangeValue: "GlobalRangeValue", Action: ">"});

//A request that does not use a limit or define an action (limit is 10 by default, action is '=')
response = yield Table1.query("LocalSecondaryIndex-index","PrimaryHashTest", {RangeValue: "SecondaryIndex"});

/*
A request on the 'PrimaryIndex'. Use the PrimaryIndexName value attached to the dynaClient.
*/
response = yield Table1.query(Table1.PrimaryIndexName,"PrimaryHashTest", {RangeValue: 1});

```

##between()##

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
var response = yield Table1.between("CustomerID-Date-index","Test1", 0, 10);

//The same call as above, but using the Primary Index for the current table.
response = yield Table1.between(TableClient1.PrimaryIndexName,"Test1", 0, 10,{Limit: 5});
```

##batchGet()##

BatchGet allows for multiple documents to be returned form an array of objects containing hash and range values. This call does not require Describe Table, but instead relies on you to pass an array of TableNames that are used to map each additional arrays of hash and range value objects to get.


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
});

```

##batchWrite()##

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

@params arrayOfTableNames (Array): Array of the table names that will be
  affected.
@params putItemsObject (Object): An object whos Keys are tableNames and values
   are arrays of objects to put into each table.

   putItemsObject = {
   <TableName1>:[{<DocumentToPut},{<DocumentToPut},{<DocumentToPut}, etc...],
   <TableName2>:[{<DocumentToPut},{<DocumentToPut},{<DocumentToPut}, etc...],
}

@params deleteItemObject (Object): An object whos keys are TableNames and values
are arrays of key objects of documents that should be removed from that table.
The object structure is identical to putItemObject, but the items inside the
array should only have the Hash and Range key-values if applicable.

@param options (Object; Optional): The DynamoDB options for a batchWrite call.
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
**/

var response = yield Table1.batchWrite(tableArray, putItemsObject, undefined, {"ReturnValues":"ALL_OLD"});

response = Table1.batchWrite(tableArray, putItemsObject, deleteItemsObject, {"ReturnConsumedCapacity":"TOTAL"});

//Some examples for the parameters and how they can be created.
var tableArray = ["Table1Name", "Table2Name"];
var putItemsObject = {};
            putItemsObject["Table1Name"] = [{'PrimaryHash': 'hansks928ks'},{'PrimaryHash': '2jjd92a3fa9'}];
            putItemsObject["Table2Name"] = [{'PrimaryHash': 55, 'PrimaryRange': 22}];
var deleteItemsObject = {};
deleteItemsObject["Table2Name"] = [{'PrimaryHash': 98, 'PrimaryRange': 32}];
//Now use the parameters to make the dynaClient call.
response = Table1.batchWrite(tableArray, putItemsObject, deleteItemsObject)
```

---

#DynaDoc Promise API#

DynaDoc has promisfied several of the AWS-SDK DocumentClient methods. They function identically to the AWS-SDK, but they now return promises (callbacks before).

##putItem()##

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

##getItem()##

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


##query()##

```javascript
/**
Query call on a dynamoDB table. Query a index of some sort.
@param params: The completed call object for the DynamoDB Document Client Query API.
**/

//The params object is the necessary Query params from the AWS-SDK DynamoDB DocumentClient.
var response = yield Table1.dynamoDoc.queryAsync(params);
```

##queryOne()##

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
var response = yield TableClient1.queryOne("SimpleIndex-index", "#tkey = :hkey", {":hkey":"2015-08-11T21:32:34.338Z"}, {"#tkey":"Timestamp"});
```

##deleteItem()##

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

##updateItem()##

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

##batchWrite()##

```javascript
/**
Promise based batchWrite call.
@param params (Object): The entire payload for batch write.
Please see the AWS SDK reference for batchWrite:
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchWrite-property

@param options (Object; Optional): DynamoDB options for a batchWrite() call.
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'

Note: You must provide table names in the params.
**/

//params is the update object similar to the one above.
var result = yield TableClient1.batchWrite(payload, {ReturnValues: 'ALL_NEW'});
```

##describeTable()##

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
var tableDescription = TableClient1.describeTable('TableName');
```


##setSettings()##

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
**/

//This will tell DynamoDB that you want all older return values from updates & puts.
TableClient1.setSettings({"ReturnValues":"ALL_OLD"});
```


## getTableName() ##

Simply returns the table name of this TableClient1.

```javascript
var tableName = TableClient1.getTableName();
```
---

# DyModel #

DyModel is DynaDoc's model API. DyModel allows DynaDoc to use a schema created by you to in turn create a DynamoDB table representing that schema. The DyModel object also exposes Joi validation methods so that objects can be validated against the provided table schema.

This Wiki page shows the methods and examples to using DynaDoc's model feature.

## Getting Started ##

DyModel is used to represent what a table should look like in DynamoDB. DyModel is reliant upon the Joi validation library. A Joi schema is parsed and used to create a DynamoDB table.

It is recommended that you create a single DynaDoc instance and export it as a module for other DynaDoc models to reference.

```javascript
//File: DynaDoc.js
//Requires the AWS-SDK
var AWS = require('aws-sdk');

/*
Here you may need to include Secrete keys if running outside of EC2.
Otherwise you can assign a DynamoDB role to EC2 instances.

Example Config with keys (These keys are not valid. Replace with your valid keys):
{
    "accessKeyId": "djakAKJDiwjskJSAKSHWnSK",
    "secretAccessKey": "maskhakJSlKJHSHFLK/SHJFKLHSKLDJSKHFKLSHfwn",
    "region": "us-east-1"
}
*/
AWS.config.update({'region':'<YOUR REGION HERE>'});
var DynaDoc = require('dynadoc');
DynaDoc.setup(AWS);

module.exports = DynaDoc;

```

If the below code was in a file called dynaTable1.js, the DynaDoc client and model could be exported and required wherever this specific client is needed.

```javascript
//File: dynaTable1.js

//Require the DynaDoc object from the above example.
var DynaDoc = require('./DynaDoc');
var Joi = DynaDoc.getJoi();

//The table name string.
var tableName = "MyNewTable";

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
var dynaTable1 = DynaDoc.createClient(tableName, testSchema, 15, 13);

//For any schema, you must specify which key is the primary key and if there is a range key (leave out if no rang key).
dynaTable1.ensurePrimaryIndex("PrimaryHashKey", "PrimaryRangeKey");

//This tells DynaDoc that the item GlobalSecondaryHash is a new Global Index.
//                      Index Hash Name (from schema), Range Name,         read, write, IndexName (As it will appear in DynamoDB)
dynaTable1.ensureGlobalIndex("GlobalSecondaryHash", "GlobalSecondaryRange", 5, 4, "GlobalIndex-index");

//Create a local index (Always share primary Hash Key):
dynaTable1.ensureLocalIndex("LocalSecondaryIndex", "LocalIndexRange-index");

/*
Create the schema in the table. The param is a boolean to ignore and not create a new table if it already exists.
This is an async call (DynamoDB returns instantly). DynaDoc does not hold a lock or anything. It is currently
your responsibility to ensure that the table is active (not in the creating state) before making other
calls to the DynamoDB table. DynaDoc provides a isTableActive() method that will return the status of
the table as a boolean (True if active, false otherwise).
*/
dynaTable1.createTable(true); //Returns a promise with response from DynamoDB

//Now anywhere this file is required, it will represent the DynaDoc client and model for this table.
module.exports = dynaTable1;
```

Now everwhere you require the model in file dynaTable1.js you will get that object with its schema and table. You can then use the standard DynaDoc API as well as use validation methods for the schema.

---

## Methods ##

Below is a list of methods for the DyModel API.

### ensurePrimaryIndex() ##

Ensures that the table (DyModel) uses the given arguments as the primary index.

```javascript
/**
Create the primary Index. You must call this and call it first!
@param hashKey (String): The name of your hashkey in your Joi model.
@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
**/
TableClient1.ensurePrimaryIndex("<MyHashKeyName>", "<MyRangeKeyName>");
```
---

### ensureGlobalIndex() ###

Ensures that a global index for the given arguments will exist in the given table. This will add a global index to the tablePayload. If createTable() has not yet been called on this table, then this method will prepare the index for the createTable() method. If createTable() method was already called, then this will prepare the index to be added after the table creation. IE. You can then use updateTable() to create the index (note that this may take additional time, even several minutes).

```javascript
/**
Ensures that a global index or the indexObject passed in will be created.
@param hashKey (String): The name of your hashkey in your Joi model.
@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
@param readCapacity (Integer): Read throughput for DynamoDB index.
@param writeCapacity (Integer): The write throughput for DynamoDB index.
@param indexName (String; Optional): The name that you want to refer to this index as.
@param options (Object; Optional): Additional options for this specific index. Options Include:
   - ProjectionType: KEYS_ONLY | INCLUDE | ALL
   - NonKeyAttributes: Array of Strings when Project is INCLUDE.
       Strings are the attribute names to project into the index.
**/
TableClient1.ensureGlobalIndex("<MyGlobalHashKeyName>", "<MyGlobalRangeKeyName>", 10, 11, "<MyIndexName>", {"ProjectionType": "ALL");
```
---

### updateGlobalIndex() ###

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
TableClient1.updateGlobalIndex("<MyGlobalIndexName>", 5, 4);
```
---

### deleteIndex() ###

This function will delete the given global index name from the DynamoDB table. This function will create the necessary information for the deletion and add it to the tablePayload object. You will need to call updateTable() in order to push the table changes.

```javascript
/**
Delete a global index.
This modifies the table Payload. updateTable will need to be called
before changes can take affect.
@param indexName (String): Name of the index to delete.
**/
TableClient1.deleteIndex("<MyGlobalIndexName>");
```

### ensureLocalIndex() ###

Ensures that a local index with the given name and range key exists in the table. Only works with create table. update table does not work yet.

```javascript
/**
Ensures that a secondary local index or the indexobject passed in will be
created. The hashKey is always the primary hash key. THis means that the primary
index must be ensured before any local indexes.

@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
@param indexName (String): The name you want to refer to this index as.
@param options (Object; Optional): Additional options for this specific index. Options Include:
   - ProjectionType: KEYS_ONLY | INCLUDE | ALL
   - NonKeyAttributes: Array of Strings when Project is INCLUDE.
       Strings are the attribute names to project into the index.
**/
TableClient1.ensureLocalIndex("<MyRangeKeyName>", "<LocalIndexName>", {"ProjectType": "INCLUDE", "NonKeyAttributes":["timestamp"]);
```
---

### setTableThroughput() ###

Adds the new table throughput to the tablePayload object. You must call updateTable() to make changes to the DynamoDB table (See updateTable() for details).

```javascript
/**
@param readThroughput (integer): Sets the read throughput for the table payload.
@param writeThroughput (integer): Sets the write throughput for the table payload.
**/
//Creates the throughput object as 10 and 15 for read and write capacity.
TableClient1.setTableThroughput(10, 15);
```
---

### getThroughput() ###

Returns the current tableThroughput for the DynaDoc client object. This does not query the table, but uses what is stored locally.

```javascript
var throughputObject = TableClient1.getThroughput();
//Prints out the read and write throughput.
console.log('The Read throughput is: ' + throughputObject.ReadCapacityUnits);
console.log('The Write throughput is: ' + throughputObject.WriteCapacityUnits
```
---
### isTableActive() ###

Checks if the table is in the active state.

```javascript
/**
@returns promise: resolves to a boolean: True if the table is active, false otherwise.
**/
TableClient1.isTableActive().then(function(res) {
  if (res) {
    //The table is active...
  }
});
```
---

### createTable() ###

After you have called all the ensure methods that you would like (or setThroughput methods), you can call createTable to try and create the table. If the table already exists, an error is thrown and a new table is not created. If the table does not exist, the method should create your table and will return immediately. It will be up to you to ensure that you do not make any calls to the table until it is in the active state. The amount of time it will take is dependent upon the size of table throughput you are requesting. You can use isTableActive() to figure out if a table is active.

```javascript
/**
REQUIRED
Given this model, create the table. This function will create the DynamoDB table that
this model represents.

DynamoDB will create the table Asynchronously. You must wait for the table
to go from inactive states to active states (IE. from Creating, to Active).
DynaDoc does not currently do this. We give you a function to check if the
table is ready. TableClient1.isTableActive();

If the table already exists a "ResourceInUseException" will be thrown.
You can check this by catching the error and looking at the "code" property.

@param ignoreAlreadyExist (Boolean): True if you want to ignore already exist errors, false otherwise.
**/
//Ignores already created errors.
TableClient1.createTable(true);
```
---

### updateTable() ###

Given the previous ensure methods and set throughput methods, this function will push all the new updates to the table. If the table is already not in an active state then this method will throw the error. This method will return immediately upon a successful call. Once updateTable() is called, then the pending changes from other DynaDoc methods will be pushed to the table. The table will enter the Updating state. No further changes can be made until the table returns to the active state (typically anything not using the indexes being updated will still be functional).  It is your responsibility to ensure that the table is in an active state before making any calls to it (otherwise you will get errors).

You must call describeTable() once the table returns to the active state in order to use the index or to know if it was deleted.

```javascript
/**
Given the current PayloadObject, update the table.

After a table update (once the table is updated and has entered the Active state), you must call describeTable() again.
If you do not call describe table, DynaDoc may not know about the new index you have added or deleted and
will not be able to use it.
**/
TableClient1.updateTable();
```
---


### getTablePayload() ###

Returns the current tablePayload. This is the object that will be sent to DynamoDB after either the createTable() or updateTable() methods are called.

```javascript
var tablePayload = TableClient1.getTablePayload();
//This will print the table payload to the console.
console.log(JSON.stringify(tablePayload, null, 4));
```

---
###toSimpleObject()###

Returns the DynaClient object as a smaller human friendly object. Good for simple debugging or sanity checks.

```javascript
//Prints the DynaClient object to the console.
console.log( JSON.stringify( TableClient1.toSimpleObject(), null, 4));
```

---

##buildSmartUpdate(newObject, options)##

Creates a new smartUpdate builder which can then build a DynamoDB update query.

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
var builder = dynaTable2.buildSmartUpdate(newObject, {
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

###add(key, options)###

The add function follows the AWS specification for ADD action in the updateExpression. This is best used with integer values and sets (not lists!). You should visit the AWS documentation for the updateExpression feature for more information: [AWS UpdateExpression Actions](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.Modifying.html#Expressions.Modifying.UpdateExpressions.ADD)  

###set(key, options)###

Set is probably the most diverse action for DynaDoc. It allows you to set an integer and/or list items as well as sets.

A simple example to push a single attribute
```javascript
/*
Sets the field integerField in the newObject passed in (IE.Prepares that
field to be pushed to the database). After this call the database will
eventually (unless you have strong consistency set on the table) be
integerField: 22
*/
var builder = TableClient1.buildSmartUpdate({integerField: 22});
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
yield TableClient1.buildSmartUpdate({newList: [2]}).set("newList", {IfNotExist: true}).send();


/*
Appends to the front the value of 4 onto the newList item previously made and
pushes it to the database table. If the AppendToFront option is not provided,
then the item is always added to the end of the list.
*/
yield TableClient1.buildSmartUpdate({newList: [4]})
   .set('timestamp', {
      AppendToFront: true
   })
   .send();

```

To set Items which are not lists, you simply reference them as you would a list with options you want.
```javascript
//Create a new builder object with the given object.
var builder = TableClient1.buildSmartUpdate({"myString": "hello", "otherString": "yes", "numberValue": 5});

//This tells the builder to use the myString and numberValue in the update payload.
builder.set('myString').set("numberValue");

//send() returns a Q promise to the DynamoDB response.
builder.send().then(function(res) {
   console.log('The dynamoDB response to the update: ' + res);
}, function(err){console.log(err)});
```

###remove(key, options)###

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
var builder = TableClient1.buildSmartUpdate(myItem);
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
var builder1 = TableClient1.buildSmartUpdate(myItem);

//Remove whatever item is in position 0 in the database OldArray attribute.
builder1.remove("OldArray", {LowerBounds: 0}).send();

var builder2 = TableClient1.buildSmartUpdate(myItem);

//Remove every item in the OldArray attribute list between index 2(inclusive) and 4 (inclusive)
builder2.remove("OldArray", {LowerBounds: 2, UpperBounds: 4}).send();

//After the async call is successfully completed, OldArray should contain [1,5,6]
```
---

Thanks and please let me know how I can improve this tool! Open issues to request new features and bugs you have found. Please provide as much detail with reproducible test cases. Thanks in advanced!

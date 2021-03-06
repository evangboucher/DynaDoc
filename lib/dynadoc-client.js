"use strict"
/*

The contents of this file are subject to the Common Public Attribution License
Version 1.0 (the “License”); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/evangboucher/DynaDoc/blob/master/LICENSE. The
License is based on the Mozilla Public License Version 1.1 but Sections 14 and
15 have been added to cover use of software over a computer network and provide
for limited attribution for the Original Developer. In addition, Exhibit A has
been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an “AS IS” basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
the specific language governing rights and limitations under the License.

The Original Code is DynaDoc.

The Initial Developer of the Original Code is Evan Boucher.
Copyright (c) Mohu Inc.  All Rights Reserved.


A library for to promisify the AWS DynamoDB SDK for
JavaScript. This library aims to take the DyanmoDB DocumentClient
to be utilized in a promisfied way so generators will work easily with
it. Each method is promified through the Q promise library.
Methods will throw an error if DynamoDB should return one. It is
your responsibility to catch and handle the errors from DynamoDB.
"Smart" will generate payloads based on the table description provided
by DynamoDB.

You can pass in a completed AWS object to initalize the client.

This file is the actual client that the DynaDoc factory will instantiate.


@TODO Make Update inteligent so it updates items specifically and conditionally.
@TODO (Stretch) Make update smarter to identify like fields and update them.


@author: Evan Boucher
@copyright: Mohu Inc.
@Created: 10/28/2015
@version: 0.4.0
*/

//Promise library.
var Promise = require('bluebird');

var Joi = require('joi');

var path = require('path');
var LIB_FOLDER = path.join(__dirname, "/");
var DYMODEL_FOLDER = path.join(LIB_FOLDER, "/dymodel/");

//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util"));

//This object will be joined with the DynaClient object.
var CONSTANTS = require(path.join(LIB_FOLDER, "constants"));

//Helper that holds the logic of generating a smart query payload.
var SmartQueryHelper = require(path.join(LIB_FOLDER, "smartQuery"));
//Helper that parses the describe table response and saves its data.
var DescribeTableHelper = require(path.join(LIB_FOLDER, "describeTable"));

var SmartBatchWriteHelper = require(path.join(LIB_FOLDER, "smartBatchWrite"));

var SmartBatchGetHelper = require(path.join(LIB_FOLDER, "smartBatchGet"));

var DyModel = require(path.join(DYMODEL_FOLDER, "dymodel"));

var https = require('https');


/**
Constructor function. By creating a new one, you can simply
use the DynamoDB DocumentClient from the AWS SDK attatched as
dynaClient.dynamoDoc
You can call describeTable at any time to update DynaDoc's
description of the table.
@param AWS (Object):  The AWS SDK Client we are passed in the constructor.
@param tableName (String): The string name of the table to parse.
@param model (Object): Joi schema that represents the Table Object.
@param options (String): Global options for this DynaDoc Client.
- ReadCapacityUnits: <Integer> The default read capacity of the table.
- WriteCapacityUnits: <Integer> The default write capacity of the table.

@returns dynaClient (Object): New Instance of DynaDoc.
**/
function DynaDoc(AWS, tableName, model, options) {

    if (!tableName) {
        //The table name does not exist, so nothing will work.
        throw Util.createError('TableName is not defined.');
    }
    if (!AWS) {
        throw Util.createError('AWS is not defined.');
    }
    if (options.hasOwnProperty(CONSTANTS.OPTION_USE_TLS1) && options[CONSTANTS.OPTION_USE_TLS1]) {
        //This is needed to avoid the ERPROTO issue with DynamoDB and NodeJS right now.
        this.dynamoDB = Promise.promisifyAll(new AWS.DynamoDB({
            httpOptions: {
            agent: new https.Agent({
              ciphers: 'ALL',
              secureProtocol: 'TLSv1_method'
            })
          }
        }));
        //We are passed the AWS client to create the DynamoDB Document Client.
        this.dynamoDoc = Promise.promisifyAll(new AWS.DynamoDB.DocumentClient({
            service: this.dynamoDB
        }));
    } else {
        this.dynamoDB = Promise.promisifyAll(new AWS.DynamoDB());
        //We are passed the AWS client to create the DynamoDB Document Client.
        this.dynamoDoc = Promise.promisifyAll(new AWS.DynamoDB.DocumentClient());
    }

    /*
    The table name that this doc client will be accessing.
    For simplicity.
    */
    this.PRIMARY_INDEX_NAME = Util.PRIMARY_INDEX_PLACEHOLDER;
    /*
    Default settings for the DynaDoc module.
    */
    this.settings = {
        ReturnValues: 'NONE',
        ReturnConsumedCapacity: 'NONE',
        ReturnItemCollectionMetrics: 'NONE',
        Limit: 10

    };
    this.settings.TableName = tableName;

    if (model) {
        var dynamoDBClient = {
                "dynamoDB": this.dynamoDB,
                "doc": this.dynamoDoc
            }
            //@TODO We should make sure we were given a valid Joi Schema.
            //The Joi Schema that validates input to this DynaClient.
        Util.mergeObject(this, new DyModel(tableName, model, dynamoDBClient, options));
    }
    Util.mergeObject(this, CONSTANTS);

}

/**
A function that generates a generic payload from the
Settings passed in at creation.
@param settings (Object): The DynaDoc settings object.
@param existingPayload (Object): A payload object to add default settings to.
**/
function generatePayload(settings) {
    if (!settings.hasOwnProperty("TableName")) {
        //The table name does not exist, so nothing will work.
        throw Util.createError('TableName is not defined.');
    }

    var payload = {};

    //Table name is always specified and is required!
    payload.TableName = settings.TableName;

    //Non required settings.
    payload.ReturnValues = settings.ReturnValue || "NONE";
    payload.ReturnConsumedCapacity = settings.ReturnConsumedCapacity || "NONE";

    return payload;
}

/**
Settings for the DynaDoc client to use.

This method does not change the TableName attribute.
In order to change the TableName you will need to either create a
new DynaDoc object or call describeTable with the new TableName.

This ensures that settings are not confused (would cause problems for
the query).

Options:
- ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
- ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
- ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
- DefaultProject: KEYS_ONLY | INCLUDE | ALL
- NonKeyAttributes: Array of Strings when Project is INCLUDE.
    Strings are the attribute names to project into the index.

userSettings: (Object) Specifies any setting that you want to set for every DynamoDB API call.
**/
DynaDoc.prototype.setSettings = function setSettings(userSettings) {
    //Go through their user settings object and pull them into our settings.
    Util.addOptionsToPayload(this.settings, userSettings);

    /*
    Force write operations to validate against the DyModel Schema (if
    available).
    @TODO implement ForceValidation option for models.
    *
    if (userSettings.ForceValidation) {
        this.settings.ForceValidation = userSettings.ForceValidation;
    }
    */
    return this;
}


/**
Promisfied Put Item API call.
The item must have the primary key (and Range key if applicable) already inside it
otherwise DyanmoDB will throw an error.

@param document (Object): The object add to the DynamoDB table (should include all necessary keys).
@param options (Object; Optional): Options for this call
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
**/
DynaDoc.prototype.putItem = function putItem(item, options) {
    /*
    @TODO DyModel this function. Validation of the item against a schema.
    @TODo Read asap: The validation works. One issue with Joi is that it
    does not validate Strings and numbers very well if they can be easily
    converted. IE. Number field with a value of "78" is a valid number.
    In a database, this is typically not ok.

    //Validate the item against the database model.
    if (this.dyModel) {
        //There is a dymodel for this dynaClient.
        Joi.assert(item, this.model, "DynaDocValidation: "); //Throws if the validation fails.
    }
    */
    var payload = generatePayload(this.settings);
    payload.Item = item;

    //Here lets add the options they passed in.
    if (options) {
        //Add the options.
        Util.addOptionsToPayload(payload, options);
    }
    //make the put call with the DynamoDoc client we have.
    return this.dynamoDoc.putAsync(payload);
};

/**
Get the item with Key value passed in.

@param Key: Should be an object, that represents the following structure.
{"PrimeKeyName":"MyHashKey"}
PrimeKeyName is the name of the primary key field in the DynamoDB table.
MyHashKey is the actual key to search the table for.
**/
DynaDoc.prototype.getItem = function getItem(key) {
    var payload = generatePayload(this.settings);
    payload.Key = key;
    var that = this;
    return new Promise(function(resolve, reject) {
        that.dynamoDoc.get(payload, function(err, res) {
            if (err) {
                reject(err);
                return;
            }
            resolve(res);
        });
    });
}


/**
Export of the createSet Function.
@param params (Object): The entire payload for createSet.
Please see the AWS SDK reference for createSet:
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#createSet-property
**/
DynaDoc.prototype.createSet = function createSet(list, options) {
    return this.dynamoDoc.createSet(list, options);
}


/**
Query call that only takes the three main arguments.
Simple assistant so the user does not have to make the payload for themselves.

 @param indexName: (String) The name of the Index that this query will search through.
    Pass null or undefined to use the primary index.
 @param keyConditionExpression: (String)The Condition expression that is used to search through the index.
  Examples:
  "#hashKey = :hashkey and #rangeKey > :rangeKey"
  "#hashKey = :hashkey and #rangeKey = :rangeKey"
  "#hashKey = :hashkey"

 @param expressionAttributeValues: (Object) Key: Variable name in key Condition Expression, Value: The value of the variable.
 @param expressionAttributeNames: (Object) Key: Hash Variable name in the key Condition Expression, Value: The Name of the Hash attribute

This method is not intelligent and requires the user to provide each structure of the call.
use query() to use DynaDoc's intelligent system.
**/
DynaDoc.prototype.queryOne = function queryOne(indexName, keyConditionExpression, expressionAttributeValues, expressionAttributeNames) {
        var payload = generatePayload(this.settings);
        if (indexName) {
            payload.IndexName = indexName;
        }
        payload.KeyConditionExpression = keyConditionExpression;
        payload.ExpressionAttributeValues = expressionAttributeValues;
        payload.ExpressionAttributeNames = expressionAttributeNames;
        return this.dynamoDoc.queryAsync(payload);
}

/**
    Function that automatically generates the necessary restful information for the
    Table in order to make requests to DynamoDB. This function makes it easier for
    developers to work with DynamoDB by giving them simple functions to query their
    tables. This is the pride and joy of DynaDoc.

    Requires: Smart functions to be enabled after the tableDescription is filled out and called.

    Notes: Given the IndexName, we can pull out other details and make the api call for them.
    This assumes there is a range value, if there is no range value then you should
    use the standard get method for standalone hashes.

    @param indexName: (String) The index name (typically ending in '-index')
    @param hashValue: The value for the hash in whatever datatype the index hash is in.
    @param action (String; Optional): An action to take on the Range value.
       Examples: "<", "=", ">=", etc. (Optional, Default: '=')

    @param options (Object; Optional): Additional Options for query found in the AWS SDK. (Optional, Default: null)
        - limit (integer; Optional): An integer limit to the number of objects to return. (Optional, Default = 10)
        - Other AWS Quer options defined in the AWS DynamoDB documentation.
        - RangeValue (String; Optional): The range value for the index to compare
           or search for. (Required if Index Requires it)
        - Action (String; Optional): An action to take on the Range value.
           Examples: "<", "=", ">=", etc. (Optional, Default: '=')

    @returns promise: Result of the query to DynamoDB.

**/
DynaDoc.prototype.query = function query(indexName, hashValue, options) {
    if (arguments.length < 2 || arguments.length > 3) {
        //We should throw some error because the user is miss using the function.
        throw Util.createError('Improper amount of arguments (#Args: ' + arguments.length + ' Expected (2-3)) for query!');
    }
    //Lets validate the indexName before we start...
    if (!(Util.getIndexes(this.settings).hasOwnProperty(indexName))) {
        throw Util.createError("query: indexName (" + indexName + ") does not exist in the Table Description. Make sure you call describeTable() or createtable().");
    }
    var rangeValue = undefined;
    var action = "=";
    if (options) {
        if (options.hasOwnProperty(CONSTANTS.KEY_RANGE_VALUE)) {
            rangeValue = options[CONSTANTS.KEY_RANGE_VALUE];
        }
        if (options.hasOwnProperty(CONSTANTS.KEY_ACTION_TYPE)) {
            action = options[CONSTANTS.KEY_ACTION_TYPE];
        }
    }

    var payload = generatePayload(this.settings);
    //Lets generate the response for them with these values.
    //All arguments provided so we parse it like normal.
    payload = SmartQueryHelper.createSmartPayload(payload, this.settings, indexName, hashValue, rangeValue, action);

    //Always set the limit, though it may get overridden in each call.
    payload.Limit = this.settings.Limit;
    if (options) {
        //If there are additional options, we should merge them into the payload.
        payload = Util.mergeObject(payload, options);
    }
    return this.dynamoDoc.queryAsync(payload);
}

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

    @TODO Integrate thing into smartQuery (since it is a query operation)
**/
DynaDoc.prototype.between = function between(indexName, hashValue, lowerRangeValue, upperRangeValue, options) {
    //Lets validate the indexName before we start...
    if (!(Util.getIndexes(this.settings)[indexName])) {
        throw Util.createError("between(): indexName does not exist in the Table Description.");
    }

    var payload = generatePayload(this.settings);
    if (arguments.length >= 4) {
        //All arguments provided so we parse it like normal.
        payload = SmartQueryHelper.createSmartPayload(payload, this.settings, indexName, hashValue, lowerRangeValue, undefined, upperRangeValue);

    } else {
        throw Util.createError('between(): Not enough arguments to do a BETWEEN query.');
    }
    //Set the limit payload to the default unless the users specifies something else in options.
    payload.Limit = this.settings.Limit;
    //Add standard Options.
    if (options) {
        Util.addOptionsToPayload(payload, options);
    }

    return this.dynamoDoc.queryAsync(payload);

}

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

@TODO This could become a better builder methodology method. Look into it.
**/
DynaDoc.prototype.batchWrite = function batchWrite(arrayOfTableNames, options) {
    var putItemsObject;
    var deleteItemObject;
    if (options) {
        if (options.hasOwnProperty(CONSTANTS.KEY_BATCH_PUT_ITEMS)) {
            putItemsObject = options[CONSTANTS.KEY_BATCH_PUT_ITEMS];
        }
        if (options.hasOwnProperty(CONSTANTS.KEY_BATCH_DELETE_ITEMS)) {
            deleteItemObject = options[CONSTANTS.KEY_BATCH_DELETE_ITEMS];
        }
    }
    var payload = SmartBatchWriteHelper.smartBatchWrite(arrayOfTableNames, putItemsObject, deleteItemObject);
    //Here lets add the options they passed in.
    if (options) {
        //Add the options.
        Util.addOptionsToPayload(payload, options);
    }
    return this.dynamoDoc.batchWriteAsync(payload);
}

/**
Makes a request to DynamoDB to batchGet several items at one time. Takes an
array of TableNames and an object that is mapping TableName to an array of
object keys to retrieve from the database.

@param arrayOfTableNames (Array<String>): An array of table names that items
will be added to.
@param batchGetKeyObject (Object): An object that maps table names to arrays of
key objects that will be used to retrieve items from DynamoDB Table. This file
has the following structure:
{
    '<TableName>':[
        {'<HashKey>':'<HashValue>',
        '<RangeKey>':'<RangeValue>'}, (Repeating for each item to retrieve)
    ],(Repeating for Each Table)
}
**/
DynaDoc.prototype.batchGet = function batchGet(arrayOfTableNames, batchGetKeyObject, options) {
    var payload = SmartBatchGetHelper.createPayload(arrayOfTableNames, batchGetKeyObject);
    if (typeof options !== "undefined") {
        Util.addOptionsToPayload(payload, options);
    }

    return this.dynamoDoc.batchGetAsync(payload);
}

/**
Delete an item from the Table.
 @param key: (Object) Keyvalue for Primary Hash and Range Hash.
 @param options (Object; Optional): The DynamoDB options for a delete() call.
     - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
     - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
     - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
**/
DynaDoc.prototype.deleteItem = function deleteItem(key, options) {
    var payload = generatePayload(this.settings);
    payload.Key = key;

    //Here lets add the options they passed in.
    if (options) {
        //Add the options.
        Util.addOptionsToPayload(payload, options);
    }

    return this.dynamoDoc.deleteAsync(payload);
}

/**
Update an item in the DynamoDB table.
params: (Object) Follow the
//Example update params.
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
DynaDoc.prototype.updateItem = function updateItem(params) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.dynamoDoc.updateAsync(params, function(err, res) {
            if (err) {
                reject(err);
                return;
            }
            resolve(res);
        });
    });
}


/**
Function will make a call to get details about a table.

@param tableName (string): The name of the table to parse. (Optional, Default:
 The name of the table DynaDoc was initialized with)

We can pull index and hashkey information out of the response.
Everything is inside of the: Table Key
**/
DynaDoc.prototype.describeTable = function describeTable(tableName) {
    if (!tableName || arguments.length === 0) {
        tableName = this.settings.TableName;
    }
    //Lets get some details about the dynamoDB table.
    var payload = {};
    payload.TableName = tableName;
    var that = this;
    return new Promise(function(resolve, reject) {
        that.dynamoDB.describeTable(payload, function(err, res) {
            if (err) {
                reject(err);
                return;
            }

            //Lets get this information for us to use!
            //Lets erease the settings object and rebuild it ourselves.
            that.settings = {};
            DescribeTableHelper.parseTableDescriptionResponse(that.settings, res.Table);
            //Lets parse the response for information.
            resolve(res);
        });
    });
}

//Checks if a the given tableDescription has an active state.
function checkIfActive(tableDescription) {
    return Util.checkTableStatusActive(tableDescription.Table.TableStatus);
}

/**
Checks if a table is currently active or not.
Returns a promise that will either be true if the table is active
or false if it is in another state.
@returns boolean: True if the table is active, false otherwise.
**/
DynaDoc.prototype.isTableActive = function isTableActive() {

    //Lets get some details about the dynamoDB table.
    var payload = {};
    payload.TableName = this.settings.TableName;
    var that = this;
    return new Promise(function(resolve, reject) {
        that.dynamoDB.describeTable(payload, function(err, res) {
            if (err) {
                reject(err);
                return;
            }
            //Lets parse the response for information.
            if (checkIfActive(res)) {
                resolve(true);
            } else {
                reject(false);
            }
        });
    });
}

/**
Deletes the table that DynaDoc currently points to.
**/
DynaDoc.prototype.deleteTable = function deleteTable() {
    //Lets delete the table.
    var payload = {};
    payload.TableName = this.settings.TableName;
    var that = this;
    return new Promise(function(resolve, reject) {
        that.dynamoDB.deleteTable(payload, function(err, res) {
            if (err) {
                reject(err);
                return;
            }
            resolve(res);
        });
    });
}

/**
REQUIRED
Given this model, create the table. After this is called, all createIndexes
calls will be blocked. This function will create the DynamoDB table that
this model represents.

DynamoDB will create the table Asynchronously. You must wait for the table
to go from inactive states to active states (IE. from Creating, to Active).
DynaDoc does not currently do this. We give you a function to check if the
table is ready. dynaClient.isTableActive();

If the table already exists a "ResourceInUseException" will be thrown.
You can check this by catching the error and looking at the "code" property.

@param ignoreAlreadyExist (Boolean): True if you want to ignore already exist errors, false otherwise.

@TODO This along with any table funcitonality should be moved into DyModel asap.
This method relies on the model object, which if undefined this method should
not work. One option would be to throw an error if model is not defined.

@TODO if a client is empty, you cannot create a table!
**/
DyModel.prototype.createTable = function createTable(ignoreAlreadyExist) {
    var that = this;
    if (that.createLock) {
        /*
        Attempt to create the table again. Lets not allow them
        to update schema this way. @TODO Maybe throw an error?
        */

    } else {
        /*
        Here we should pass the finished schema into the parser so DynaDoc
        smart features will be useable. Do this regardless of success or failure.
        */
        DescribeTableHelper.parseTableDescriptionResponse(that.settings, that.tablePayload);
    }

    return new Promise(function(resolve, reject) {
        that.dynamoDB.createTable(that.tablePayload, function(err, res) {
            if (err) {
                if (err.code === "ResourceInUseException" && err.message.indexOf("Table already exists:") > -1) {
                    //Regardless of if the user wants to ignore it or not, we should note that it was already created.
                    that.createLock = true;
                    that.resetTablePayload();

                    //If they want to ignore it.
                    if (ignoreAlreadyExist) {
                        resolve(true);
                        return;
                    }
                }
                reject(err);
                throw err;
            }
            //Lock the DyModel so it cannot create anything (only updates now).
            that.createLock = true;
            //Wipe the temporary tablePayload and
            that.resetTablePayload();
            resolve(res);
        });
    });
}


/**
Given the current PayloadObject, update the table.
Once you call updateTable and it successfully returns, you will
not be able to call createTable() again (for this in memory instance).

@TODO Bit of a pickle here... We need to figure out how to update the dynadoc
settings object so that it knows about the removal and addition of new
indexes. However, the result of a delete as an update does not return
a full description of the table to parse. For now we will require that users
use Describe table after an update to ensure that the table is accurate.
**/
DyModel.prototype.updateTable = function updateTable() {
    if (!this.hasOwnProperty("tablePayload")) {
        //If there is no tablePayload, then we cannot update the table.
        throw Util.createError('Unable to update table as there is nothing new to update.');
    }
    //A call to update the table.
    var that = this;
    return new Promise(function(resolve, reject) {
        that.dynamoDB.updateTable(that.tablePayload, function(err, res) {
            if (err) {
                reject(err);
                return;
            }
            that.createLock = true;
            //Resolve the promise.
            resolve(res);
            //Here lets re-init the table. SO the next update is clean.
            that.resetTablePayload();
        });
    });
}

/**
Smart Scan will generate the payload given values from the user.
SmartSvan will return a last evaluated item which can be used to as a starting point
for the next smartScan call (DynamoDB returns from scanning after the first
1MB is scanned).

@TODO Implement the smart scan payload generation.
**/
//Not yet implemented, but a place holder for it.
/*
DynaDoc.prototype.smartScan = function smartScan() {
    return "Not Yet Implemented!";
}
*/

/**
Returns the DynaClient table name.
**/
DynaDoc.prototype.getTableName = function getTableName() {
    return this.settings.TableName;
}

/**
Print the settings object to the console.
**/
DynaDoc.prototype.printSettings = function printSettings() {
    console.log(JSON.stringify(this.settings, null, 4));
}

/**
Return the DynaDoc instance settings.
**/
DynaDoc.prototype.getSettings = function getSettings() {
    return this.settings;
}

/**
Use this method at your own discretion! You should use methodNames that will
never overlap with DynaDoc functions. IE. Prefix or suffix the methodName
with something unique to your program.

Adds an artibutary function to the DynaDoc Client.
This Client will then have the function accesible from the methodName passed in.
IE. With a method name of 'addOneToItem', and a function of:
function(item) { return item+1; }

could then be accessed like: dynaClient.addOneToItem(2);
which would return 3 in the above case.

It is recommended to use this function as it checks to make sure you do not
overwrite an existing function of DynaDoc. You should surround this method
with a try/catch block to ensure that future iterations to not crash your
program.

@param methodName (String): The name of the function you want to add.
@param method (Function()): The function that will be added to this DynaClient
   as the methodName.
**/
DynaDoc.prototype.addFunction = function addFunction(methodName, method) {
    //Need a way to ensure that the method name does not override anything.
    if (this[methodName] && this[methodName] !== 0) {
        //Method name already exists. Throw error.
        throw Util.createError('addFunction(): Method name: ' + methodName + ' already exists in DynaDoc!');
    }
    //Check that it does not override anything in DyModel.
    if (this.dyModel[methodName] && this.dyModel[methodName] !== 0) {
        //Method name already exists. Throw error.
        throw Util.createError('addFunction(): Method name: ' + methodName + ' already exists in DynaDoc!');
    }

    this[methodName] = method;
}
module.exports = DynaDoc;

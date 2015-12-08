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

//Q the promised library.
var Q = require('q');
var Joi = require('joi');

var path = require('path');
var LIB_FOLDER = path.join(__dirname, "/");
var DYMODEL_FOLDER = path.join(LIB_FOLDER, "/dymodel/");

//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util"));

//This object will be joined with the DynaClient object.
var Constants = require(path.join(LIB_FOLDER, "util"));

//Helper that holds the logic of generating a smart query payload.
var SmartQueryHelper = require(path.join(LIB_FOLDER, "smartQuery"));
//Helper that parses the describe table response and saves its data.
var DescribeTableHelper = require(path.join(LIB_FOLDER, "describeTable"));

var SmartBatchWriteHelper = require(path.join(LIB_FOLDER, "smartBatchWrite"));

var SmartBatchGetHelper = require(path.join(LIB_FOLDER, "smartBatchGet"));

var DyModel = require(path.join(DYMODEL_FOLDER, "dymodel"));

/*
Default settings for the DynaDoc module.
Never reference a global variable in the constructor unless you
want it to be shared across all instances (in our case we do not).
*/
var DEFAULT_SETTINGS = {
    ReturnValues: 'NONE',
    ReturnConsumedCapacity: 'NONE',
    ReturnItemCollectionMetrics: 'NONE',
    Limit: 10

}



/**
Constructor function. By creating a new one, you can simply
use the DynamoDB DocumentClient from the AWS SDK attatched as
dynaClient.dynamoDoc
You can call describeTable at any time to update DynaDoc's
description of the table.
@param AWS (Object):  The AWS SDK Client we are passed in the constructor.
@param tableName (String): The string name of the table to parse.
@param model (Object): Joi schema that represents the Table Object.
@param readCapacity (integer): The number of read unites for this table.
@param writeCapacity (integer): The number of write units for this table.

@returns dynaClient (Object): New Instance of DynaDoc.
**/
function DynaDoc(AWS, tableName, model, readCapacity, writeCapacity) {

    if (!tableName) {
        //The table name does not exist, so nothing will work.
        throw Util.createError('TableName is not defined.');
    }
    if (!AWS) {
        throw Util.createError('AWS is not defined.');
    }
    this.dynamoDB = new AWS.DynamoDB();
    //We are passed the AWS client to create the DynamoDB Document Client.
    this.dynamoDoc = new AWS.DynamoDB.DocumentClient();
    /*
    The table name that this doc client will be accessing.
    For simplicity.
    */
    this.PRIMARY_INDEX_NAME = Util.PRIMARY_INDEX_PLACEHOLDER;

    this.settings = {
        ReturnValues: 'NONE',
        ReturnConsumedCapacity: 'NONE',
        ReturnItemCollectionMetrics: 'NONE',
        Limit: 10

    };
    this.settings.TableName = tableName;

    if (model) {
        //@TODO We should make sure we were given a valid Joi Schema.
        //The Joi Schema that validates input to this DynaClient.
        //this.dymodel = new DyModel(tableName, model, this.dynamoDB, readCapacity, writeCapacity);
        Util.mergeObject(this, new DyModel(tableName, model, this.dynamoDB, readCapacity, writeCapacity));
    }
    Util.mergeObject(this, Constants);

}

/**
Simple error checking to reuse some code.
**/
function errorCheck(err, d) {
    if (err) {
        d.reject(err);
        throw err;
    }
}

/**
A function that generates a generic payload from the
Settings passed in at creation.
@param settings (Object): The DynaDoc settings object.
@param existingPayload (Object): A payload object to add default settings to.
**/
function generatePayload(settings, existingPayload) {
    if (!settings.TableName) {
        //The table name does not exist, so nothing will work.
        throw Util.createError('TableName is not defined.');
    }

    var payload = {};
    //If we already have a payload, lets just append the defaults to it.
    if (existingPayload) {
        payload = existingPayload;
    }
    //Table name is always specified and is required!
    payload.TableName = settings.TableName;

    //Non required settings.
    payload.ReturnValues = settings.ReturnValue || DEFAULT_SETTINGS.ReturnValue;
    payload.ReturnConsumedCapacity = settings.ReturnConsumedCapacity || DEFAULT_SETTINGS.ReturnConsumedCapacity;

    return payload;
}

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
ForceValidation: true | false
DefaultProject: KEYS_ONLY | INCLUDE | ALL
NonKeyAttributes: Array of Strings when Project is INCLUDE.
    Strings are the attribute names to project into the index.

userSettings: (Object) Specifies any setting that you want to set for every DynamoDB API call.
**/
DynaDoc.prototype.setSettings = function setSettings(userSettings) {
    //Go through their user settings object and pull them into our settings.
    /*
    @TODO Ensure that the following is not a security issue (injections)
    */
    /*
    Return Value is limited in some calls such as Scan, Query, Get, CreateSet, batchWrite, batchGet
    Only usable in: Put, Update, and Delete.
    Need to check and make sure it is not sent otherwise DynamoDB will return validation Errors.
    */
    if (userSettings.ReturnValues) {
        this.settings.ReturnValues = userSettings.ReturnValues;
    }
    //Check if they want to get Returned consumedCapacity
    /*
    Availalbe in every method but CreateSet. (CreateSet will likely not be implemented).
    */
    if (userSettings.ReturnConsumedCapacity) {
        this.settings.ReturnConsumedCapacity = userSettings.ReturnConsumedCapacity;
    }

    //Option to return Item collection Metrics.
    /*
    Use only in: batchWrite, Put, Delete, and Update.
    Not availalbe in other methods.
    */
    if (userSettings.ReturnItemCollectionMetrics) {
        this.settings.ReturnItemCollectionMetrics = userSettings.ReturnItemCollectionMetrics;
    }
    /*
    Set the default limit of items returned.
    */
    if (userSettings.Limit) {
        this.settings.Limit = userSettings.Limit;
    }

    /*
    Force write operations to validate against the DyModel Schema (if
    available).
    @TODO implement ForceValidation option for models.
    *
    if (userSettings.ForceValidation) {
        this.settings.ForceValidation = userSettings.ForceValidation;
    }
    */
}

/**
Promisfied Put Item API call.
The item must have the primary key (and Range key if applicable) already inside it
otherwise DyanmoDB will throw an error.

@param document (Object): The object add to the DynamoDB table (should include all necessary keys).
**/
DynaDoc.prototype.putItem = function putItem(item) {
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
    var d = Q.defer();
    var payload = generatePayload(this.settings);
    payload.Item = item;
    //make the put call with the DynamoDoc client we have.
    this.dynamoDoc.put(payload, function(err, res) {
        errorCheck(err, d);
        //If we made it here with no error thrown, then we must have data.
        d.resolve(res);
    });
    return d.promise;
};

/**
Get the item with Key value passed in.

@param Key: Should be an object, that represents the following structure.
{"PrimeKeyName":"MyHashKey"}
PrimeKeyName is the name of the primary key field in the DynamoDB table.
MyHashKey is the actual key to search the table for.
**/
DynaDoc.prototype.getItem = function getItem(key) {
        var d = Q.defer();
        var payload = generatePayload(this.settings);

        payload.Key = key;
        this.dynamoDoc.get(payload, function(err, res) {
            errorCheck(err, d);
            d.resolve(res);
        });
        return d.promise;
    }
    /**
    Query call on a dynamoDB table. Query a index of some sort.
    @param params: The completed call object for the DynamoDB Document Client Query API.
    **/
DynaDoc.prototype.query = function query(params) {
    //Given the entire params needed from the DynamoDB Doc client.
    var d = Q.defer();
    //We assume the params is the whole payload.
    this.dynamoDoc.query(params, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/**
Promise based batchGet call.
@param params (Object): The entire payload for batch get.
Please see the AWS SDK reference for batchGet:
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchGet-property

Note: You must provide table names in the params.
**/
DynaDoc.prototype.batchGet = function batchGet(params) {
    var d = Q.defer();
    this.dynamoDoc.batchGet(params, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/**
Promise based batchWrite call.
@param params (Object): The entire payload for batch write.
Please see the AWS SDK reference for batchWrite:
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchWrite-property

Note: You must provide table names in the params.
**/
DynaDoc.prototype.batchWrite = function batchWrite(params) {
    var d = Q.defer();
    this.dynamoDoc.batchWrite(params, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/**
Promise based scan call.
@param params (Object): The entire payload for scan.
Please see the AWS SDK reference for scan:
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#scan-property
**/
DynaDoc.prototype.scan = function scan(params) {
    var d = Q.defer();
    this.dynamoDoc.scan(params, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/**
Promise based createSet call.
@param params (Object): The entire payload for createSet.
Please see the AWS SDK reference for createSet:
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#createSet-property
**/
DynaDoc.prototype.createSet = function createSet(params) {
    var d = Q.defer();
    this.dynamoDoc.createSet(params, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
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
use smartQuery() to use DynaDoc's intelligent system.
**/
DynaDoc.prototype.queryOne = function queryOne(indexName, keyConditionExpression, expressionAttributeValues, expressionAttributeNames) {
        var payload = generatePayload(this.settings);
        if (indexName) {
            payload.IndexName = indexName;
        }
        payload.KeyConditionExpression = keyConditionExpression;
        payload.ExpressionAttributeValues = expressionAttributeValues;
        payload.ExpressionAttributeNames = expressionAttributeNames;

        return this.query(payload);
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
    @param rangeValue: The range value for the index to compare or search for. (Required if Index Requires it)
    @param action: An action to take on the Range value. Examples: "<", "=", ">=", etc. (Optional, Default: '=')
    @param limit: An integer limit to the number of objects to return. (Optional, Default = 10)

    @param additionalOptions (Object): Additional Options for query found in the AWS SDK. (Optional, Default: null)

    @returns promise: Result of the query to DynamoDB.

    Notes: I tested performance of time in this function by measuring execution time and completion.
    The method prepration for smart query is roughly 2-3ms
    The total call time (largely dependent on DynamoDB response and network latency): 70-120ms
    The actual benefit for saving smart queries is almost pointless in time (unless it saves memory). Time difference: -1ms to 1ms

    @TODO Support BETWEEN calls (two range values).
    To support BETWEEN calls, we will need another Rangevalue.
    The action is always "AND" for BETWEEN calls.
    This may require a smarter way to handle these parameters.

    **/
DynaDoc.prototype.smartQuery = function smartQuery(indexName, hashValue, rangeValue, action, limit, additionalOptions) {
    var d = Q.defer();
    //Lets validate the indexName before we start...
    if (!(Util.getIndexes(this.settings)[indexName])) {
        throw Util.createError("smartQuery: indexName (" + indexName + ") does not exist in the Table Description. Make sure you call describeTable() or createtable().");
    }
    var payload = generatePayload(this.settings);
    //Lets generate the response for them with these values.
    if (arguments.length === 2) {
        //Pass undefined in so it will skip the range value.
        payload = SmartQueryHelper.createSmartPayload(payload, this.settings, indexName, hashValue, undefined, undefined);
    } else if (arguments.length === 3) {
        //Pass undefined in so it will skip the range value.
        payload = SmartQueryHelper.createSmartPayload(payload, this.settings, indexName, hashValue, rangeValue, undefined);
    } else if (arguments.length >= 4) {
        //All arguments provided so we parse it like normal.
        payload = SmartQueryHelper.createSmartPayload(payload, this.settings, indexName, hashValue, rangeValue, action);

    } else {
        //We should throw some error because the user is miss using the function.
        throw Util.createError('Not enough arguments for smartQuery!');
    }

    if (!limit) {
        limit = this.settings.Limit;
    }
    if (additionalOptions) {
        //If there are additional options, we should merge them into the payload.
        payload = Util.mergeObject(payload, additionalOptions);
    }
    //Always set the limit.
    payload.Limit = limit;
    this.dynamoDoc.query(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/**
    The smart query Between call. Will return items from the indexName that are
    between the given lowerRangeValue and the upperRangeValue.
    You can pass in an Integer to limit the number of items that are returned.

    @param indexName: (String) The index name (typically ending in '-index')
    @param hashValue: The value for the hash in whatever datatype the index hash is in.
    @param lowerRangeValue: The lower range value for the index to compare or search for.
    @param upperRangeValue: The upper range value for the BETWEEN query.
    @param limit (Integer): Limit the number of documents to return (optional, Default = 10);

    @TODO Integrate thing into smartQuery (since it is a query operation)
**/
DynaDoc.prototype.smartBetween = function smartBetween(indexName, hashValue, lowerRangeValue, upperRangeValue, limit) {
    var d = Q.defer();
    //Lets validate the indexName before we start...
    if (!(Util.getIndexes(this.settings)[indexName])) {
        throw Util.createError("smartQuery(): indexName does not exist in the Table Description.");
    }

    var payload = generatePayload(this.settings);
    if (arguments.length >= 4) {
        //All arguments provided so we parse it like normal.
        payload = SmartQueryHelper.createSmartPayload(payload, this.settings, indexName, hashValue, lowerRangeValue, undefined, upperRangeValue);

    } else {
        throw Util.createError('smartBetween(): Not enough arguments to do a BETWEEN query.');
    }
    if (!limit) {
        limit = this.settings.Limit;
    }
    payload.Limit = limit;
    this.dynamoDoc.query(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;

}

/**
This function will create the smart payload given the following
params and send it to DynamoDB. This function supports both PutRequest and
DeleteRequest. You must pass seperate objects in as parameters for PutRequests
and DeleteRequest. Make sure that table names match the object keys.

@param arrayOfTableNames (Array): Array of the table names that will be
  affected.
@param putItemsObject (Object): An object whos Keys are tableNames and values
   are arrays of objects to put into each table.

   putItemsObject = {
   <TableName1>:[{<DocumentToPut},{<DocumentToPut},{<DocumentToPut}, etc...],
   <TableName2>:[{<DocumentToPut},{<DocumentToPut},{<DocumentToPut}, etc...],
}

@param deleteItemObject (Object): An object whos keys are TableNames and values
are arrays of key objects of documents that should be removed from that table.
The object structure is identical to putItemObject, but the items inside the
array should only have the Hash and Range key-values if applicable.
**/
DynaDoc.prototype.smartBatchWrite = function smartBatchWrite(arrayOfTableNames, putItemsObject, deleteItemObject) {

    var d = Q.defer();
    var payload = SmartBatchWriteHelper.smartBatchWrite(arrayOfTableNames, putItemsObject, deleteItemObject);
    this.dynamoDoc.batchWrite(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
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
DynaDoc.prototype.smartBatchGet = function smartBatchGet(arrayOfTableNames, batchGetKeyObject) {
    var d = Q.defer();
    var payload = SmartBatchGetHelper.createPayload(arrayOfTableNames, batchGetKeyObject);
    this.dynamoDoc.batchGet(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/**
Delete an item from the Table.
 @param key: (Object) Keyvalue for Primary Hash and Range Hash.
**/
DynaDoc.prototype.deleteItem = function deleteItem(key) {
    var d = Q.defer();
    var payload = generatePayload(this.settings);
    payload.Key = key;
    this.dynamoDoc.delete(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
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
    var d = Q.defer();
    this.dynamoDoc.update(params, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
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
    var d = Q.defer();
    var payload = {};
    payload.TableName = tableName;
    var that = this;
    this.dynamoDB.describeTable(payload, function(err, res) {
        errorCheck(err, d);
        //Lets parse the response for information.
        d.resolve(res);
        //Lets get this information for us to use!
        //Lets erease the settings object and rebuild it ourselves.
        that.settings = {};
        DescribeTableHelper.parseTableDescriptionResponse(that.settings, res.Table);
    });
    return d.promise;
}

//Checks if a the given tableDescription has an active state.
function checkIfActive(tableDescription) {
    var status = tableDescription.Table.TableStatus;
    return Util.checkTableStatusActive(status);
}

/**
Checks if a table is currently active or not.
Returns a promise that will either be true if the table is active
or false if it is in another state.
@returns boolean: True if the table is active, false otherwise.
**/
DynaDoc.prototype.isTableActive = function isTableActive() {

    //Lets get some details about the dynamoDB table.
    var d = Q.defer();
    var payload = {};
    payload.TableName = this.settings.TableName;
    this.dynamoDB.describeTable(payload, function(err, res) {
        errorCheck(err, d);
        //Lets parse the response for information.
        if (checkIfActive(res)) {
            d.resolve(true);
        } else {
            d.resolve(false);
        }
    });
    return d.promise;
}

/**
Deletes the table that DynaDoc currently points to.
**/
DynaDoc.prototype.deleteTable = function deleteTable() {
    //Lets delete the table.
    var d = Q.defer();
    var payload = {};
    payload.TableName = this.settings.TableName;
    this.dynamoDB.deleteTable(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
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
    var d = Q.defer();
    var that = this;
    if (that.createLock) {
        /*
        Attempt to create the table again. Lets not allow them
        to update schema this way. @TODO Maybe throw an error?
        */

    }else {
        /*
        Here we should pass the finished schema into the parser so DynaDoc
        smart features will be useable. Do this regardless of success or failure.
        */
        DescribeTableHelper.parseTableDescriptionResponse(that.settings, that.tablePayload);
    }

    this.dynamoDB.createTable(that.tablePayload, function(err, res) {

        if (err) {
            if (err.code === "ResourceInUseException" && err.message.indexOf("Table already exists:") > -1) {
                //Regardless of if the user wants to ignore it or not, we should note that it was already created.
                that.createLock = true;
                that.resetTablePayload();

                //If they want to ignore it.
                if (ignoreAlreadyExist) {
                    d.resolve(true);
                    return;
                }

            }
            d.reject(err);
            throw err;
        }
        //Lock the DyModel so it cannot create anything (only updates now).
        that.createLock = true;
        //Wipe the temporary tablePayload and
        that.resetTablePayload();
        d.resolve(res);
    });
    return d.promise;
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
    if (!this.tablePayload) {
        //If there is no tablePayload, then we cannot update the table.
        throw Util.createError('Unable to update table as there is nothing new to update.');
    }
    //A call to update the table.
    var d = Q.defer();
    var that = this;
    this.dynamoDB.updateTable(this.tablePayload, function(err, res) {
        if (err) {
            d.reject(err);
            return;
        }
        that.createLock = true;
        //Resolve the promise.
        d.resolve(res);
        //Here lets re-init the table. SO the next update is clean.
        that.resetTablePayload();
    });
    return d.promise;

}

/**
Smart Scan will generate the payload given values from the user.
SmartSvan will return a last evaluated item which can be used to as a starting point
for the next smartScan call (DynamoDB returns from scanning after the first
1MB is scanned).

@TODO Implement the smart payload generation.
**/
//Not yet implemented, but a place holder for it.
/*
DynaDoc.prototype.smartScan = function smartScan() {
    return "Not Yet Implemented!";
}

function smartScanHelper() {
    var d = Q.defer();
    var payload = generatePayload(this.settings);

    //Now we need to generate the smart payload.
    this.dynamoDoc.scan(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
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
    if (this[methodName]) {
        //Method name already exists. Throw error.
        throw Util.createError('addFunction(): Method name: ' + methodName + ' already exists in DynaDoc!');
    }
    //Check that it does not override anything in DyModel.
    if (this.dyModel[methodName]) {
        //Method name already exists. Throw error.
        throw Util.createError('addFunction(): Method name: ' + methodName + ' already exists in DynaDoc!');
    }

    this[methodName] = method;
}


module.exports = DynaDoc;

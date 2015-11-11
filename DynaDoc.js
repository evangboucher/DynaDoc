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


@TODO Make Update inteligent so it updates items specifically and conditionally.
@TODO (Stretch) Make update smarter to identify like fields and update them.

Not yet released to NPM

@author: Evan Boucher
@copyright: Mohu Inc.
@Created: 10/28/2015
@version: 0.0.1
*/

//Q the promised library.
var Q = require('q');

const PAYLOAD_HASH_NAME_KEY = "#hName";
const PAYLOAD_HASH_VALUE_KEY = ":hValue";
const PAYLOAD_RANGE_NAME_KEY = "#rName";
const PAYLOAD_RANGE_VALUE_KEY = ":rValue";
const PAYLOAD_RANGE_UPPER_NAME_KEY = "#rUValue";
const PAYLOAD_RANGE_UPPER_VALUE_KEY = ":rUValue";

const PRIMARY_INDEX_PLACEHOLDER = "PrimaryIndex";

/*
Default settings for the DynaDoc module.
*/
const DEFAULT_SETTINGS = {
    ReturnValues: 'NONE',
    ReturnConsumedCapacity: 'NONE',
    ReturnItemCollectionMetrics: 'NONE',
    Limit: 10

}


/*
Constructor function. By creating a new one, DynaDoc will
go ahead and parse the table description. You can call
describeTable at any time to update DynaDoc's description
of the table.
Params: The AWS SDK Client we are passed in the constructor.
*/
var DynaDoc = function DynaDoc(AWS, tableName) {

    if (!tableName) {
        //The table name does not exist, so nothing will work.
        throw new Error('DynaDoc: TableName is not defined.');
    }
    if (!AWS) {
        throw new Error('DynaDoc: AWS is not defined.');
    }
    this.dynamoDB = new AWS.DynamoDB();
    //We are passed the AWS client to create the DynamoDB Document Client.
    this.dynamoDoc = new AWS.DynamoDB.DocumentClient();
    /*
    The table name that this doc client will be accessing.
    For simplicity.
    */

    this.dynadoc = {};
    this.settings = DEFAULT_SETTINGS;
    this.settings.TableName = tableName;

}



/*
Simple error checking to reuse some code.
*/
function errorCheck(err, d) {
    if (err) {
        d.reject();
        throw err;
    }
}
/*
A function that generates a generic payload from the
Settings passed in at creation.
*/
function generatePayload() {
    if (!this.settings.TableName) {
        //The table name does not exist, so nothing will work.
        throw new Error('DynaDoc: TableName is not defined.');
    }
    var payload = {};
    //Table name is always specified and is required!
    payload.TableName = this.settings.TableName;

    //Non required settings.
    payload.ReturnValues = this.settings.ReturnValue || DEFAULT_SETTINGS.ReturnValue;
    payload.ReturnConsumedCapacity = this.settings.ReturnConsumedCapacity || DEFAULT_SETTINGS.ReturnConsumedCapacity;

    return payload;
}
/*
Settings for the DynaDoc client to use.

This method does not change the TableName attribute.
In order to change the TableName you will need to either create a
new DynaDoc object or call describeTable with the new TableName.

This ensures that settings are not confused (would cause problems for
the smart query).

userSettings: (Object) Specifies any setting that you want to set for every DynamoDB API call.
*/
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
}

/*
Promisfied Put Item API call.
The item must have the primary key already inside it
otherwise DyanmoDB will throw an error.
*/
DynaDoc.prototype.putItem = function* putItem(item) {
    var d = Q.defer();
    var payload = generatePayload.call(this);
    payload.Item = item;
    //make the put call with the DynamoDoc client we have.
    this.dynamoDoc.put(payload, function(err, res) {
        errorCheck(err, d);
        //If we made it here with no error thrown, then we must have data.
        d.resolve(res);
    });
    return d.promise;
};

/*
Get the item with Key value passed in.

Key: Should be an object, that represents the following structure.
{"PrimeKeyName":"MyHashKey"}
PrimeKeyName is the name of the primary key field in the DynamoDB table.
MyHashKey is the actual key to search the table for.
*/
DynaDoc.prototype.getItem = function* getItem(key) {
    var d = Q.defer();
    var payload = generatePayload.call(this);

    payload.Key = key;
    this.dynamoDoc.get(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/*
Query call on a dynamoDB table. Query a index of some sort.
params: The completed call object for the DynamoDB Document Client Query API.
*/
DynaDoc.prototype.query = function* query(params) {
    //Given the entire params needed from the DynamoDB Doc client.
    var d = Q.defer();
    //We assume the params is the whole payload.
    this.dynamoDoc.query(params, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}


/*
Query One item given the three main parameters.
Assistant so the user does not have to make the payload for themselves.

indexName: (String) The name of the Index that this query will search through.
keyConditionExpression: (String)The Condition expression that is used to search through the index.
  Examples:
  "#hashKey = :hashkey and #rangeKey > :rangeKey"
  "#hashKey = :hashkey and #rangeKey = :rangeKey"
  "#hashKey = :hashkey"

expressionAttributeValues: (Object) Key: Variable name in key Condition Expression, Value: The value of the variable.
expressionAttributeNames: (Object) Key: Hash Variable name in the key Condition Expression, Value: The Name of the Hash attribute

This method is not inteliigent and requires the user to provide each structure of the call.
use smartQuery() to use DynaDoc's intelligent system.
*/
DynaDoc.prototype.queryOne = function* queryOne(indexName, keyConditionExpression, expressionAttributeValues, expressionAttributeNames) {
        var payload = generatePayload.call(this);
        payload.IndexName = indexName;
        payload.KeyConditionExpression = keyConditionExpression;
        payload.ExpressionAttributeValues = expressionAttributeValues;
        payload.ExpressionAttributeNames = expressionAttributeNames;

        return yield this.query(payload);
    }
    /*
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
        @param rangeValue: The range value for the index to compare or search for. (Optional)
        @param action: An action to take on the Range value. Examples: "<", "=", ">=", etc. (Optional, Default: '=')
        @param limit: An integer limit to the number of objects to return.

        Notes: I tested performance of time in this function by measuring execution time and completion.
        The method prepration for smart query is roughly 2-3ms
        The total call time (largely dependent on DynamoDB response and network latency): 70-120ms
        The actual benefit for saving smart queries is almost pointless in time (unless it saves memory). Time difference: -1ms to 1ms

        @TODO Support BETWEEN calls (two range values).
        To support BETWEEN calls, we will need another Rangevalue.
        The action is always "AND" for BETWEEN calls.
        This may require a smarter way to handle these parameters.

    */
DynaDoc.prototype.smartQuery = function* smartQuery(indexName, hashValue, rangeValue, action, limit) {
    var d = Q.defer();
    //Lets validate the indexName before we start...
    if (!(getIndexes(this.settings)[indexName])) {
        throw new Error("DynaDoc:smartQuery: indexName does not exist in the Table Description.");
    }

    var payload = generatePayload.call(this);
    //Lets generate the response for them with these values.
    if (arguments.length === 2) {
        //Pass undefined in so it will skip the range value.
        payload = createSmartPayload(payload, this.settings, indexName, hashValue, undefined, undefined);
    } else if (arguments.length === 3) {
        //Pass undefined in so it will skip the range value.
        payload = createSmartPayload(payload, this.settings, indexName, hashValue, rangeValue, undefined);
    } else if (arguments.length >= 4) {
        //All arguments provided so we parse it like normal.
        payload = createSmartPayload(payload, this.settings, indexName, hashValue, rangeValue, action);

    } else {
        //We should throw some error because the user is miss using the function.
        throw new Error('Not enough arguments for smartQuery!');
    }

    if (!limit) {
        limit = this.settings.Limit;
    }
    //Always set the limit.
    payload.Limit = limit;
    this.dynamoDoc.query(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/*
    The smart query Between call. Will return items from the indexName that are
    between the given lowerRangeValue and the upperRangeValue.
    You can pass in a intger to limit the number of items that are returned.

    @TODO Integrate thing into smartQuery (since it is a query operation)
*/
DynaDoc.prototype.smartBetween = function* smartBetween(indexName, hashValue, lowerRangeValue, upperRangeValue, limit) {
    var d = Q.defer();
    //Lets validate the indexName before we start...
    if (!(getIndexes(this.settings)[indexName])) {
        throw new Error("DynaDoc:smartQuery: indexName does not exist in the Table Description.");
    }

    var payload = generatePayload.call(this);
    if (arguments.length >= 4) {
        //All arguments provided so we parse it like normal.
        payload = createSmartPayload(payload, this.settings, indexName, hashValue, lowerRangeValue, undefined, upperRangeValue);

    } else {
        throw new Error('smartBetween(): Not enough arguments to do a BETWEEN query.');
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

/*
Delete an item from the Table.
key: (Object) Keyvalue for Primary Hash and Range Hash.
*/
DynaDoc.prototype.deleteItem = function* deleteItem(key) {
    var d = Q.defer();
    var payload = generatePayload.call(this);
    payload.Key = key;
    this.dynamoDoc.delete(payload, function(err, res) {
        errorCheck(err, d);
        d.resolve(res);
    });
    return d.promise;
}

/*
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

*/
DynaDoc.prototype.updateItem = function* updateItem(params) {
    var d = Q.defer();
    this.dynamoDoc.update(params, function(err, res) {
        errorCheck(err);
        d.resolve(res);
    });
    return d.promise;
}

/*
Function will make a call to get details about a table.

We can pull index and hashkey information out of the response.
Everything is inside of the: Table Key
*/
DynaDoc.prototype.describeTable = function* describeTable(tableName) {
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
        parseTableDescriptionResponse(that.settings, res.Table);
    });
    return d.promise;
}

// --------------------- Begin the Smart features!!!! ------------------------------
/*
Creates a payload given the data from the user and describeTable method.
Requires that you pass Settings and payload. It does not make any changes to Settings,
but will add query keys to the payload.

@param upperRangeValue: If defined, then the query generated will be a BETWEEN query.

@TODO THis is awesome! However, generating this everytime for potentially similar queiries
may be time wasteful. Simply being able to change the values for an existing query will be
best!
I believe this can be done by hashing the index name with the action, storing it in Another
object, then referencing that object by hash when the same command appears again! This way,
all we really have to do is change the ExpressionAttributeValues's values! :D

The other option to this problem would be to open up some form of this method (at least return
value). This way a developer could create the query once and change the values themselves.
Generating the smart query everytime for the same call is wasteful.
*/
function createSmartPayload(payload, settings, indexName, hashValue, rangeValue, action, upperRangeValue) {
    //Get the Indexes object from settings (contains all the indexes).
    var Indexes = getIndexes(settings);
    //Pull out the index object for the index the user wants to use
    var indexObject = Indexes[indexName];
    if (!indexObject) {
        throw new Error('DynaDoc: IndexName does not exist in Table Description.');
        return;
    }

    if (!action) {
        //No action was defined, so lets always use '='
        action = "=";
    }
    //Check if they gave us a range value, the index may require it. (0  is an acceptable value)
    if (indexObject.Range && (!rangeValue && (rangeValue != 0))) {
        //There is a range object and no rangeValue.
        throw new Error('DynaDoc: The index: ' + indexName + ' requires a Range Value. Please specify one.');
    }

    //Lets check for already existing smart query

    var smartQuery = getSavedQuery(settings, indexName, action);
    /*
    Performance wise, the two methods are about the same. Infact, in some
    cases, recreating the query every time is faster! (likely the hash algroithm)
    Lets never save a BETWEEN value for right now...
    */
    if (smartQuery && !upperRangeValue) {
        /*
        This means we already have the payload in the smartQuery object.
        This works by the assumption that all of the payload stays the same
        but the values.
        */
        var expressionAttributeValues = smartQuery.ExpressionAttributeValues;
        if (expressionAttributeValues) {
            //All is going well, lets set the values.
            //We may need to set hash and/or range values.
            expressionAttributeValues[PAYLOAD_HASH_VALUE_KEY] = hashValue;
            if (rangeValue) {
                expressionAttributeValues[PAYLOAD_RANGE_VALUE_KEY] = rangeValue;
            }

            payload = smartQuery;
            return smartQuery;
        } else {
            //If we do not have the expression Attribute saved, we cannot use this payload!
            //Do nothing and lets generate it  again...
        }
    } else {
        //No saved query was found.
    }
    //Initialize our variables.
    var expressionAttributeNames = {};
    var expressionAttributeValues = {};

    var keyConditionExpression = "";
    //We need to check if this is a primary index or secondary.
    if (indexObject.isPrimary) {
        //This is the primary index then you do not specify an IndexName (default is primary!)
    } else {
        payload.IndexName = indexName;
    }

    //Generate the name expression attributes.
    expressionAttributeNames[PAYLOAD_HASH_NAME_KEY] = indexObject.Hash.name;
    expressionAttributeValues[PAYLOAD_HASH_VALUE_KEY] = hashValue;

    //Now generate the keyConditionExpression.
    keyConditionExpression = PAYLOAD_HASH_NAME_KEY + " = " + PAYLOAD_HASH_VALUE_KEY;

    //If we are also including a range value.
    if (rangeValue) {
        //Check if the range is a Between or standard range.
        if (upperRangeValue) {
            //we need to set it up for a BETWEEN value range. BETWEEN always using "and" as its action.
            keyConditionExpression += " and " + PAYLOAD_RANGE_NAME_KEY + " BETWEEN " + PAYLOAD_RANGE_VALUE_KEY + " and " + PAYLOAD_RANGE_UPPER_VALUE_KEY;
            //set the extra Upper value.
            PAYLOAD_RANGE_UPPER_NAME_KEY
            //Set the upper value.
            expressionAttributeValues[PAYLOAD_RANGE_UPPER_VALUE_KEY] = upperRangeValue;
        } else {
            //The general Range expression with the user action.
            keyConditionExpression += " and " + PAYLOAD_RANGE_NAME_KEY + " " + action + " " + PAYLOAD_RANGE_VALUE_KEY;
        }
        //Change their values.
        expressionAttributeNames[PAYLOAD_RANGE_NAME_KEY] = indexObject.Range.name;
        expressionAttributeValues[PAYLOAD_RANGE_VALUE_KEY] = rangeValue;
    }
    payload.KeyConditionExpression = keyConditionExpression;
    payload.ExpressionAttributeValues = expressionAttributeValues;
    payload.ExpressionAttributeNames = expressionAttributeNames;
    //Lets save the query for use later!
    saveQuery(settings, payload, action);
    return payload;


}
/*
    Get the Indexes object for
*/
function getIndexes(settings) {
    if (!settings.Indexes) {
        settings.Indexes = {};
    }
    return settings.Indexes;
}

/*
    Get the saved smart queiries object in settings.
*/
function getSavedQueriesObject(settings) {
    if (!settings.savedQueries) {
        settings.savedQueries = {};
    }
    return settings.savedQueries;
}
/*
 Generate a string that will be used as the key (not a real hash)
*/
function getQueryHash(indexName, action) {
    return indexName + action;
}
/*
    Check if a smart query already exists and returns the payload object.
*/
function getSavedQuery(settings, indexName, action) {

    var queryHash = getQueryHash(indexName, action);
    var savedQueries = getSavedQueriesObject(settings);
    if (savedQueries[queryHash]) {
        return savedQueries[queryHash];
    }
    //Return undefined if we did not find the hash.
    return undefined;
}
/*
    Save a smart query to be used later so it does not have to be generated.
    Pass in action (easier than parsing the payload for the action.)
*/
function saveQuery(settings, payload, action) {
    //We can pull the necessary details from the payload.
    var indexName = payload.IndexName;
    if (!indexName) {
        //the indexName is not defined, this means it is primary.
        indexName = PRIMARY_INDEX_PLACEHOLDER;
    }
    var queryHash = getQueryHash(indexName, action);
    var savedQueries = getSavedQueriesObject(settings);
    //Save the payload with its hash.
    savedQueries[queryHash] = payload;
}

/*
Parses out the primary Key Schema for the Table.
Adds the indexes to the Indexes section of the DynaDoc settings.
*/
function parsePrimaryKeySchema(settings, primaryKeySchema) {
    var Indexes = getIndexes(settings);
    Indexes[PRIMARY_INDEX_PLACEHOLDER] = {
        "Hash": {
            "name": primaryKeySchema[0].AttributeName
        },
        "isPrimary": true
    };
    //Now we need to see if there is a range key.
    if (primaryKeySchema.length === 2) {

        Indexes[PRIMARY_INDEX_PLACEHOLDER].Range = {
            "name": primaryKeySchema[1].AttributeName
        };
    }

}

/*
Parses the Secondary Key Schema Arrays into a hash and Range key (if available).
Returns: Boolean, True if succeessfully parsed and added, false otherwise.
*/
function parseSecondaryKeySchema(settings, secondaryIndexArray) {
    var temp = {};
    var indexes = getIndexes(settings);
    for (var i = 0; i < secondaryIndexArray.length; i++) {
        temp = secondaryIndexArray[i];
        /*
            The structure will allow us to easily create
            expressions with a given index name.
        */
        indexes[temp.IndexName] = {
            "Hash": {
                "name": temp.KeySchema[0].AttributeName
            }
        }
        if (temp.KeySchema.length === 2) {

            indexes[temp.IndexName].Range = {
                "name": temp.KeySchema[1].AttributeName
            };
        }

    }
    return true;
}
/*
Simple funciton to conver the attribute definitions array into an easily accessable
object for accessing attribute Type.
*/
function convertAttributeDefinitionsToObject(attributeDefinitionsArray) {
    //Lets conver the Attribute definitions into a object that we can easily use.
    var AttributeDefinitionsObject = {};
    var temp = {};
    for (var i = 0; i < attributeDefinitionsArray.length; i++) {
        temp = attributeDefinitionsArray[i];
        AttributeDefinitionsObject[temp.AttributeName] = temp.AttributeType;
    }
    return AttributeDefinitionsObject;
}

/*
Parse the array in the TableObject that tells us what the datatype for each
index is.
*/
function parseAttributeDefinitions(settings, attributeDefinitionsArray) {
    //Given the attribute definitions array, lets go through and match it to our indexes.
    var temp = {};
    var Indexes = getIndexes(settings);
    var attributeObject = convertAttributeDefinitionsToObject(attributeDefinitionsArray);
    //We need to pull out all the indexes and go through them.
    var topIndexNames = Object.keys(Indexes);
    var tempIndexName = "";
    var tempObject = {};
    for (var i = 0; i < topIndexNames.length; i++) {
        tempIndexName = topIndexNames[i];
        tempObject = Indexes[tempIndexName];

        if (tempObject.Hash) {
            //Get the datatype for the hash.
            tempObject.Hash.datatype = attributeObject[tempObject.Hash.name];
        }
        if (tempObject.Range) {
            //Get the datatype for the range.
            tempObject.Range.datatype = attributeObject[tempObject.Range.name];
        }

    }
}

/*
Given the value of the "Table" key from a DescriptionTable response, this function
will parse the important data out for DynaDoc to go through and use for the table.
This will be a challenge, but would be an amazing feature.
@TODO Use attribute definitions in other methods to check index values to ensure they are correct (Optional).
*/
function parseTableDescriptionResponse(settings, TableObject) {
    if (!TableObject) {
        throw new Error('ERROR: TableObject is not defined! No way to parse it!');

    } else if (!settings) {
        throw new Error('ERROR: Settings is not defined!');

    }

    //Make sure settings reflects this table name.
    settings.TableName = TableObject.TableName;

    //Lets pull out the primary hash schema.
    //Array object to describe the primary key (hash with or without Range.) [0] is Primary, [1] is range
    var PrimaryHashSchema = TableObject.KeySchema;
    //Array of the LocalSecondaryIndexs that this table has.
    var LocalSecondaryIndexes = TableObject.LocalSecondaryIndexes;
    //The global Secondary Indexes available in this table.
    var GlobalSecondaryIndexes = TableObject.GlobalSecondaryIndexes;
    //Defines the data type for each index (only defined in this, not inside individual indexe objects for some silly reason).
    var AttributeDefinitions = TableObject.AttributeDefinitions;

    //Get the primary hash key and range key into indexes.
    parsePrimaryKeySchema(settings, TableObject.KeySchema);

    //Get LocalSecondaryIndexes setup.
    if (TableObject.LocalSecondaryIndexes) {
        parseSecondaryKeySchema(settings, TableObject.LocalSecondaryIndexes);
    }

    if (TableObject.GlobalSecondaryIndexes) {
        parseSecondaryKeySchema(settings, TableObject.GlobalSecondaryIndexes);
    }

    //Now that we have all the indexes, we can setup the attribute values and know what each index should be.
    parseAttributeDefinitions(settings, TableObject.AttributeDefinitions);
}

/*

*/
//DynaDoc.prototype.

module.exports = DynaDoc;

"use strict"
/*
A custom library for Mohu to promisify the AWS DynamoDB SDK for
JavaScript. This library aims to take the DyanmoDB DocumentClient
to be utilized in a promisfied way so generators will work easily with
it. Each method is promified through the Q promise library.
Methods will throw an error if DynamoDB should return one. It is
your responsibility to catch and handle the errors from DynamoDB.

You can pass in a completed AWS object to initalize the client.

I aim to make this library reusable and hope to make it into a
seperate module.

@TODO Valiidate all params that are passed in.
@TODO Make Query smarter so user can use simple range queries.
@TODO (Stretch) Make update smarter to identify like fields and update them.
@TODO

@author: Evan Boucher
@copyright: Mohu Inc.
@Created: 10/28/2015
*/

//Q the promised library.
var Q = require('q');

var Joi = require('Joi');
/*
Default settings for the DynaDoc module.
*/
var DEFAULT_SETTINGS = {
    ReturnValues: 'NONE',
    ReturnConsumedCapacity: 'NONE',
    ReturnItemCollectionMetrics: 'NONE',
    PrimaryIndexName: null,
    RangeIndexName: null

}


/*
Constructor function.
Params: The AWS SDK Client we are passed in the constructor.
*/
function DynaDoc(AWS, tableName) {
    this.dynamoDB = new AWS.DynamoDB();
    //We are passed the AWS client to create the DynamoDB Document Client.
    this.dynamoDoc = new AWS.DynamoDB.DocumentClient();
    /*
    The table name that this doc client will be accessing.
    For simplicity.
    @TODO Add validation to params.
    */
    this.TABLE_NAME = tableName;
    this.dynadoc = {};
    this.settings = DEFAULT_SETTINGS;
}

/*
Simple error checking to reuse some code.
*/
function errorCheck(err, d) {
    if (err) {
        console.log('Error in response from DynoDoc.');
        d.reject();
        throw err;
    }
}
/*
A function that generates a generic payload from the
Settings passed in at creation.
*/
function generatePayload() {
    console.log('GeneratePayload Entered.');
    console.log('this.TableName: ' + this.TABLE_NAME);
    var payload = {};
    //Table name is always specified and is required!
    payload.TableName = this.TABLE_NAME;

    //Non required settings.
    payload.ReturnValues = 'ALL_OLD';
    payload.ReturnConsumedCapacity = 'TOTAL';

    /*
    @TODO Make sure that this.Table name exist and figure out Settings.
    */
    return payload;
}
/*
Settings for the DynaDoc client to use.

userSettings: (Object) Specifies any setting that you want to set for every DynamoDB API call.
*/
DynaDoc.prototype.settings = function* settings(userSettings) {
    //Go through the settings object and pull them into our settings.
    /*
    @TODO Ensure that the following is not a security issue (injections)
    @TODO Try to figure out if there is a better way to do this.
    */
    //See what type of Return value they want.
    /*
    @TODO Return Value is limited in some calls such as Scan, Query, Get, CreateSet, batchWrite, batchGet
    Only usable in: Put, Update, and Delete.
    Need to check and make sure it is not sent otherwise DynamoDB will return validation Errors.
    */
    if (userSettings.ReturnValue) {
        this.settings.ReturnValue = userSettings.ReturnValue;
    }
    //Check if they want to get Returned consumedCapacity
    /*
    @TODO Availalbe in every method but CreateSet. Validate (not sure if CreateSet will be implemented or not).
    */
    if (userSettings.ReturnConsumedCapacity) {
        this.settings.ReturnConsumedCapacity = userSettings.ReturnConsumedCapacity;
    }
    //See if they are making a change to the Table Name.
    if (userSettings.TableName) {
        this.settings.TableName = userSettings.TableName;
    }
    //Save the primary index name.
    if (userSettings.PrimaryIndexName) {
        this.settings.PrimaryIndexName = userSettings.PrimaryIndexName;
    }
    //Save the primary Range key name.
    if (userSettings.RangeIndexName) {
        this.settings.RangeIndexName = userSettings.RangeIndexName;
    }
    //Option to return Item collection Metrics.
    /*
    @TODO Use only in: batchWrite, Put, Delete, and Update.
    Not availalbe in other methods.
    */
    if (userSettings.ReturnItemCollectionMetrics) {
        this.settings.ReturnItemCollectionMetrics = userSettings.ReturnItemCollectionMetrics;
    }
}

/*
Promisfied Put Item API call.
*/
DynaDoc.prototype.putItem = function* putItem(item) {
    var d = Q.defer();
    var payload = generatePayload.call(this);
    payload.Item = item;
    //console.log('About to call dynamoDoc putItem.');
    //make the put call with the DynamoDoc client we have.
    this.dynamoDoc.put(payload, function(err, res) {
        errorCheck(err, d);
        //If we made it here with no error thrown, then we must have data.
        d.resolve(res);
    });
    //console.log('Returning dynamoDoc putItem promise.');
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
    /*
    if (Joi.string(key)) {
        //The key is a string, so lets take it as the hash.
        if (this.settings.PrimaryIndexName) {
            payload.Key = {};
            payload.Key[this.settings.PrimaryIndexName] = key;

        }
    } else {
        //If the key is not defined in settings, then use the parameter.
        payload.Key = key;
    }
    */
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
expressionAttributeValues: (Object) Key: Variable name in key Condition Expression, Value: The value of the variable.

@TODO Improve this by allowing the user to enter more information about their table.
IE. Get the name of the Primary Hash Index. (Settings)
See if there is a Range value involved.
Figure out inteligent way to search for Range values (in expressions) **We could then generate the KeyValue Expression and get Attribute values from the user**
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

@TODO I can use this information to fill in the Settings automatically!

We can pull index and hashkey information out of the response.
Everything is inside of the: Table Key

*/
DynaDoc.prototype.describeTable = function *describeTable(tableName) {
    console.log('describeTable entered');
    //Lets get some details about the dynamoDB table.
    var d = Q.defer();
    var payload = {};
    payload.TableName = tableName;
    this.dynamoDB.describeTable(payload, function(err, res) {
        errorCheck(err, d);
        //Lets parse the response for information.
        console.log(JSON.stringify(res, null, 3));
        d.resolve(res);
    });
    console.log('describeTable exit.');
    return d.promise;
}

/*
Given the value of the "Table" key from a DescriptionTable response, this function
will parse the important data out for DynaDoc to go through and use for the table.

@TODO Finished pulling Primary Hash Schema out.
@TODO Finish getting GlobalSecondary Index data out.
@TODO Finish getting local secondary Index data out.
@TODO Create and implement the ability to check types for the Attribute definitions for indexes across the table.
*/
function parseTableDescriptionResponse(TableObject) {
    //Lets pull out the primary hash schema.
    //Array object to describe the primary key (hash with or without Range.) [0] is Primary, [1] is range
    var PrimaryHashSchema = TableObject.KeySchema;
    //Array of the LocalSecondaryIndexs that this table has.
    var LocalSecondaryIndexs = TableObject.LocalSecondaryIndexes;
    //The global Secondary Indexes available in this table.
    var GlobalSecondaryIndexes = TableObject.GlobalSecondaryIndexes;
    //Defines the data type for each index (only defined in this, not inside individual indexe objects for some silly reason).
    var AttributeDefinitions = TableObject.AttributeDefinitions;

    
}

/*

*/
//DynaDoc.prototype.

module.exports = DynaDoc;

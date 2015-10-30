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
    ReturnItemCollectionMetrics: 'NONE'

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

    this.dynadoc = {};
    this.settings = DEFAULT_SETTINGS;
    this.settings.TableName = tableName;
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
    console.log('this.TableName: ' + this.settings.TableName);
    var payload = {};
    //Table name is always specified and is required!
    payload.TableName = this.settings.TableName;

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
  Examples:
  "#hashKey = :hashkey and #rangeKey > :rangeKey"
  "#hashKey = :hashkey and #rangeKey = :rangeKey"
  "#hashKey = :hashkey "

expressionAttributeValues: (Object) Key: Variable name in key Condition Expression, Value: The value of the variable.
expressionAttributeNames: (Object) Key: Hash Variable name in the key Condition Expression, Value: The Name of the Hash attribute

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
        Once smart functions are enables after the tableDescription is filled out and called.

        Given the IndexName, we can pull out other details and make the api call for them.
        This assumes there is a range value, if there is no range value then you should
        use the standard get method for standalone hashes.

        indexName: (String) The index name (typically ending in '-index')
        hashValue: The value for the hash in whatever datatype the index hash is in.
        rangeValue: The range value for the index to compare or search for. (Optional)
        action: An action to take on the Range value. Examples: "<", "=", ">=", etc. (Optional, Default: '=')

        @TODO Work in the Settings object to make smart queries.
        @TODO Add the option to use 'Limit' in the query (limits the number of results).
        @TODO Support BETWEEN calls (two range values).
        
    */
DynaDoc.prototype.smartQuery = function* smartQuery(indexName, hashValue, rangeValue, action, limit  ) {
    var d = Q.defer();
    var payload = generatePayload.call(this);
    //Lets generate the response for them with these values.
    if (arguments.length === 2) {
        //Pass null in so it will skip the range value.
        createSmartPayload(payload, this.settings,  indexName, hashValue, null, null);
    } else if(arguments.length === 3) {
        //Pass null in so it will skip the range value.
        createSmartPayload(payload, this.settings,  indexName, hashValue, rangeValue, null);
    } else if (arguments.length >= 4){
        //All arguments provided so we parse it like normal.
        createSmartPayload(payload, this.settings,  indexName, hashValue, rangeValue, action);

    } else {
        //We should throw some error because the user is miss using the function.
        throw new Error('Not enough arguments for smartQuery!');
        return; //To make sure we do not continue.
    }

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

@TODO I can use this information to fill in the Settings automatically!

We can pull index and hashkey information out of the response.
Everything is inside of the: Table Key

*/
DynaDoc.prototype.describeTable = function* describeTable(tableName) {
        console.log('describeTable entered');
        //Lets get some details about the dynamoDB table.
        var d = Q.defer();
        var payload = {};
        payload.TableName = tableName;
        var that = this;
        this.dynamoDB.describeTable(payload, function(err, res) {
            errorCheck(err, d);
            //Lets parse the response for information.
            console.log(JSON.stringify(res, null, 3));
            d.resolve(res);
            console.log('The response from DynamoDB for describeTable.');
            console.log(JSON.stringify(res.Table, null, 3));
            console.log('END SERVER RESPONSE for DESCRIBETABLE');
            //Lets get this information for us to use!

            parseTableDescriptionResponse(that.settings, res.Table);
        });
        console.log('describeTable exit.');
        return d.promise;
    }

// --------------------- Begin the Smarts features!!!! ------------------------------
/*
Creates a payload given the data from the user and describeTable method.
Requires that you pass Settings and payload. It does not make any changes to Settings,
but will add query keys to the payload.

@TODO Need to make this so you do not have to use Range values (helpful)

@TODO THis is awesome! However, generating this everytime for potentially similar queiries
may be time wasteful. Simply being able to change the values for an existing query will be
best!
I believe this can be done by hashing the index name with the action, storing it in Another
object, then referencing that object by hash when the same command appears again! This way,
all we really have to do is change the ExpressionAttributeValues's values! :D
*/
function createSmartPayload(payload, settings, indexName, hashValue, rangeValue, action) {
    console.log('Creating a smart payload for the user.');


    var Indexes = getIndexes(settings);
    var indexObject = Indexes[indexName];
    if (!indexObject) {
        //@TODO check if maybe they meant to use the Primary Index (Hash and Range are seperated in this case?)
        console.log('ERROR! The index Object is not defined so we are not smart enough!');
        return;
    }
    console.log('The indexObject we are using in the smarts:');
    console.log(JSON.stringify(indexObject, null, 3));

    //Generate the Key attribute values and name objects.
    var expressionAttributeNames = {};
    var expressionAttributeValues = {};
    var hashNameString = "";
    var rangeNameString = "";
    var hashValueString = "";
    var rangeValueString = "";
    //ExpressionAttributeNames["#" + ]

    var keyConditionExpression = "";
    //We need to check if this is a primary index or secondary.
    if (indexObject.isPrimary) {
        //This is the primary index then you do not specify an IndexName (default is primary!)

    }else {
        payload.IndexName = indexName;
    }// else {
        //@TODO may be able to may this simpilier.
        hashNameString = "#HName" ; //+ indexObject.Hash.name
        hashValueString = ":HValue"; // + indexObject.Hash.name

        //Generate the name expression attributes.
        expressionAttributeNames[hashNameString] = indexObject.Hash.name;
        expressionAttributeValues[hashValueString] = hashValue;

        //Now generate the keyConditionExpression.
        keyConditionExpression = hashNameString + " = " + hashValueString;

        //If we are also including a range value.
        if (rangeValue) {
            rangeNameString = "#RName";// + indexObject.Range.name
            rangeValueString = ":RValue";// + indexObject.Range.name
            expressionAttributeNames[rangeNameString] = indexObject.Range.name;
            expressionAttributeValues[rangeValueString] = rangeValue;
            if (!action) {
                //No action was defined, so lets always use '='
                action = "=";
            }
            keyConditionExpression += " and " + rangeNameString + " " + action + " " + rangeValueString;
        }
    //}
    payload.KeyConditionExpression = keyConditionExpression;
    payload.ExpressionAttributeValues = expressionAttributeValues;
    payload.ExpressionAttributeNames = expressionAttributeNames;
    console.log('The final smart payload we have built is: ');
    console.log(JSON.stringify(payload, null, 3));
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
Parses out the primary Key Schema for the Table.
Adds the indexes to the Indexes section of the DynaDoc settings.
*/
function parsePrimaryKeySchema(settings, primaryKeySchema) {
    var Indexes = getIndexes(settings);
    Indexes.PrimaryIndex = {
        "Hash":{"name": primaryKeySchema[0].AttributeName},
        "isPrimary":true
    };
    //Now we need to see if there is a range key.
    if (primaryKeySchema.length === 2) {

        Indexes.PrimaryIndex.Range = {"name": primaryKeySchema[1].AttributeName};
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


@TODO Create and implement the ability to check types for the Attribute definitions for indexes across the table.
*/
function parseTableDescriptionResponse(settings, TableObject) {
    if (!TableObject) {
        console.log('ERROR: TableObject is not defined! No way to parse it!');
        return;
    } else if (!settings) {
        console.log('ERROR: Settings is not defined!');
        return;
    }
    console.log('parseTableDescriptionResponse: All params are defined.');

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
    } else {
        console.log('DynaDoc: No Local Secondary Indexes found.');
    }

    if (TableObject.GlobalSecondaryIndexes) {
        parseSecondaryKeySchema(settings, TableObject.GlobalSecondaryIndexes);
    }

    //Now that we have all the indexes, we can setup the attribute values and know what each index should be.
    parseAttributeDefinitions(settings, TableObject.AttributeDefinitions);

    console.log('The Final Settings object we have created for this Table is:');
    console.log(JSON.stringify(settings, null, 3));
}

/*

*/
//DynaDoc.prototype.

module.exports = DynaDoc;

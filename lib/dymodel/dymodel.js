/**
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


The DynaDoc model object main file.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

/**
@TODO Features I want to add to this:

- Validate input automatically in DynaDoc calls (against the model)
- Relationships between models/tables??? (Maybe...stretch)
**/

var path = require('path');
//__dirname is the local directory. One up is the lib directory.
const LIB_FOLDER = __dirname + "/../";
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

var Q = require('q');

var Joi = require('joi');

var CONSTANTS = require(path.join(__dirname, "../constants.js"));

var ModelValidatorHelper = require(path.join(__dirname, "./modelValidator"));
var CreateIndexHelper = require(path.join(__dirname, "./createIndex"));
var SmartUpdateHelper = require(path.join(__dirname, "./smartUpdateHelper"));
var SmartUpdate = require(path.join(__dirname, "./SmartUpdate"));

var MAX_THROUGHPUT = 20000;
var MIN_THROUGHPUT = 1;

const DEFAULT_READ_THROUGHPUT = 50;
const DEFAULT_WRITE_THROUGHPUT = 10;





//Here we create a new DyModel object to parse.

/**
Constructor for a DyModel which is the object that represents the data
inside a table in DynamoDB. This object will have access to the DynamoDB
SDK related to the table.

@param modelName (String): The name of the model that this object represents.
The table name will likely follow this name unless overridden.
@param model (Object): The Joi schema that this model represents.
@param dynamoDB (Object): The DynamoDB JavaScript SDK object.
@param options (Object): Various options for DyModel.
- ReadCapacityUnits: <Integer> The default read capacity of the table.
- WriteCapacityUnits: <Integer> The default write capacity of the table.
**/
function DyModel(modelName, model, dynamoDB, options) {
    //Create a new DyModel
    //model is the Joi schema for this model.
    this.model = model;
    this.modelName = modelName;
    //Needs to be hardcoded and not global or it will be shared across all objects
    this.MAX_THROUGHPUT = 20000;
    this.MIN_THROUGHPUT = 1;
    this.dynamoDB = dynamoDB.dynamoDB
    this.dynamoDoc = dynamoDB.doc;
    if (options.hasOwnProperty("ReadCapacityUnits")) {
        this.readCapacity = options.ReadCapacityUnits;
    } else {
        this.readCapacity = 50; //The DEFAULT_READ_THROUGHPUT;
    }

    if (options.hasOwnProperty("WriteCapacityUnits")) {
        this.writeCapacity = options.WriteCapacityUnits;
    } else {
        this.writeCapacity = 10; //The DEFAULT_WRITE_THROUGHPUT
    }

    this.tablePayload = {};
    this.tablePayload.TableName = modelName;
    this.createLock = false;

    //Parse the initial dyModel.
    this.dyModel = ModelValidatorHelper.parseJoiSchema(this.model, this.modelName);
    /*
    Once we have parsed the Joi model, we can set the ProvisionedThroughput.
    Since the table is assumed to not be created yet, we can override the
    IOPs lock for now.
    */
    this.setTableThroughput(this.readCapacity, this.writeCapacity);
    //Override the IOPs lock now.
    this.updateIOPSLock = false;
}


/**
Prints out the model in a simple way.
**/
DyModel.prototype.toSimpleObject = function toSimpleObject() {
    return {
        "modelName": this.modelName,
        "model": this.dyModel,
        "MAX_THROUGHPUT": this.MAX_THROUGHPUT,
        "MIN_THROUGHPUT": this.MIN_THROUGHPUT,
        "readCapacity": this.readCapacity,
        "writeCapacity": this.writeCapacity
    };
}

/**
Returns the model's current tablePayload object.
This will be used to create or update the table.
**/
DyModel.prototype.getTablePayload = function getTablePayload() {
    return this.tablePayload;
}


/**
Sets the current tablePayload ProvisionedThroughput object to
the given read and write throughput values.

**/
function setThroughput(tableCreationPayload, readCapacity, writeCapacity) {

    tableCreationPayload.ProvisionedThroughput = {
        "ReadCapacityUnits": readCapacity,
        "WriteCapacityUnits": writeCapacity
    };
}

/*
Sets the read and write throughput for this tablePayload.
@param readCapacity (integer): Integer between the min (1) and max throughput for read capacity
@param writeCapacity (integer): Integer between the min (1) and max throughput for write capacity.
*/
DyModel.prototype.setTableThroughput = function setTableThroughput(readCapacity, writeCapacity) {

    //These assertions will fail if the user passes in bad input.
    Joi.assert(readCapacity, Joi.number().integer().min(this.MIN_THROUGHPUT).max(this.MAX_THROUGHPUT));
    Joi.assert(writeCapacity, Joi.number().integer().min(this.MIN_THROUGHPUT).max(this.MAX_THROUGHPUT));
    this.readCapacity = readCapacity;
    this.writeCapacity = writeCapacity;
    setThroughput(this.tablePayload, readCapacity, writeCapacity);
    this.updateIOPSLock = true;
    return this;
}

/**
Returns the given throughput for the current Table.
**/
DyModel.prototype.getThroughput = function getThroughput() {
    return Util.createThroughputItem(this.readCapacity, this.writeCapacity).ProvisionedThroughput;
}


/**
Set the max throughput for the given table.
**/
DyModel.prototype.setMaxThroughput = function setMaxThroughput(max) {
    Joi.assert(max, Joi.number().integer().min(this.MIN_THROUGHPUT));
    this.MAX_THROUGHPUT = max;
    return this;
}

/**
Create the primary Index. You must call this and call it first!
@param hashKey (String): The name of your hashkey in your Joi model.
@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
**/
DyModel.prototype.primaryIndex = function primaryIndex(hashKey, rangeKey) {
    if (this.createLock === true) {
        throw Util.createError('primaryIndex was called after the table was created!')
    }
    var indexObject = CreateIndexHelper.createIndexObject(hashKey, rangeKey);
    CreateIndexHelper.addPrimaryIndex(this.tablePayload, indexObject, this.dyModel);
    return this;
}

/**
Add a global index to the payload/Table.
If the table is already created, then the index will be added as an update.
You should call updateTable in this case (DynaDoc will not know which call to
do). Creating Global Indexes after table creation is time intensive. It can
take a several minutes depending on the size of the table and index.


@param hashKey (String): The name of your hashkey in your Joi model.
@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key

@param indexName (String; Optional): The name that you want to refer to this index as.
@param options (Object; Optional): Additional options for this specific index. Options Include:
   - ProjectionType: KEYS_ONLY | INCLUDE | ALL
   - NonKeyAttributes: Array of Strings when Project is INCLUDE.
       Strings are the attribute names to project into the index.
   - ReadCapacityUnits (Integer): Read throughput for DynamoDB index.
   - WriteCapacityUnits (Integer): The write throughput for DynamoDB index.
   - RangeKey (String, Integer, boolean, Set): The rangekey for this index.

**/
DyModel.prototype.globalIndex = function globalIndex(indexName, hashKey, options) {
        //Generate the table name or pull it from options. @TODO Name is required by design.
        //var indexName = CreateIndexHelper.getIndexName(options, this.tableName, hashKey, rangeKey);
        var rangeKey = undefined;
        if (options && options.hasOwnProperty(CONSTANTS.KEY_RANGE_KEY)) {
            rangeKey = options[CONSTANTS.KEY_RANGE_KEY];
            delete options[CONSTANTS.KEY_RANGE_KEY];
        }
        //Global Indexes are the only indexes that can be updated or created after the table is generated.
        var indexObject = CreateIndexHelper.createIndexObject(hashKey, rangeKey, options);
        if (this.createLock === true) {
            //If the table has already been created, then we need to  either create the index for the update.
            if (Util.getIndexes(this.settings)[indexName]) {
                //The indexname already exists so we should not create it.
                throw Util.createError('IndexName of ' + indexName + ' already exists. Can not create the index twice.');
            }


            //Pass true for the last argument to make it an UpdateTable addition.
            CreateIndexHelper.addGlobalIndex(this.tablePayload, indexObject, this.dyModel, indexName, true);
            return;
        }
        CreateIndexHelper.addGlobalIndex(this.tablePayload, indexObject, this.dyModel, indexName);
        return this;
    }
    /**
    Adds a secondary local index to the payload/Table.
    The hashKey is always the primary hash key. THis means that the primary
    index must be ensured before any local indexes.

    @param rangeKey (String): The name of the range key in your Joi model (optional)
       Leave as Undefined if you do not want to specify a range Key
    @param indexName (String): The name you want to refer to this index as.
    @param options (Object; Optional): Additional options for this specific index. Options Include:
       - ProjectionType: KEYS_ONLY | INCLUDE | ALL
       - NonKeyAttributes: Array of Strings when Project is INCLUDE.
           Strings are the attribute names to project into the index.

    **/
DyModel.prototype.localIndex = function localIndex(indexName, rangeKey, options) {
    if (arguments.length < 2) {
        throw Util.createError("ensureLocalIndex() must be called with at least 2 arguments: indexName and rangeKey");
    }
    if (this.createLock === true) {
        throw Util.createError('DynaDoc: ensureLocalIndex was called after the table was created!');
    }
    var hashKey = Util.getPrimaryIndexFromModel(this.dyModel)[Util.constants.INDEX_PRIMARY_HASH];
    //Generate the table name or pull it from options.
    //var indexName = CreateIndexHelper.getIndexName(options, , hashKey, rangeKey);

    var indexObject = CreateIndexHelper.createIndexObjectLocal(hashKey, rangeKey, options);
    CreateIndexHelper.addLocalIndex(this.tablePayload, indexObject, this.dyModel, indexName);
    return this;

}

/**
Update the read and write capacity of an index.
Adds the update object to the GlobalIndex TablePayload for the update call.
You will still need to call updateTable() and wait for the table to be
active.
@param indexName (String): The name of the index in DynamoDB.
@param readCapacity (integer): The new set provisioned read throughput for this index.
@param writeCapacity (integer): The new set provisioned write throughput for this index.
**/
DyModel.prototype.updateGlobalIndex = function updateGlobalIndex(indexName, readCapacity, writeCapacity) {
        //These assertions will fail if the user passes in bad input. Should move validation to a seperate function eventualy.
        Joi.assert(readCapacity, Joi.number().integer().min(this.MIN_THROUGHPUT).max(this.MAX_THROUGHPUT));
        Joi.assert(writeCapacity, Joi.number().integer().min(this.MIN_THROUGHPUT).max(this.MAX_THROUGHPUT));

        CreateIndexHelper.updateGlobalIndex(this.tablePayload, indexName, readCapacity, writeCapacity);
        this.updateIOPSLock = true;
        return this;
    }
    /**
    Delete a global index.
    This modifies the table Payload. updateTable will need to be called
    before changes can take affect.
    @param indexName (String): Name of the index to delete.
    **/
DyModel.prototype.deleteIndex = function updateIndex(indexName) {
    if (!indexName) {
        throw Util.createError('deleteIndex(): indexName is undefined.');
    }
    //Add the delete item to the table payload.
    CreateIndexHelper.deleteIndex(this.tablePayload, indexName);
    return this;
}

/**
Adds StreamSpecification to the table payload. Can be used in createTable or
updateTable. You must call createTable or updateTable for these changes to take
effect. You CANNOT update table IOPs in any manner and also update the streams
in the same call. You must seperate the two updateTable() calls. This is a requirement
by DynamoDB.

Note: You will receive a ResourceInUseException if you attempt to enable a
stream on a table that already has a stream, or if you attempt to disable a
stream on a table which does not have a stream (once you call createTable() or
updateTable()).

@params streamEnabled (boolean): True to enable streams, false to disable.
@params streamType (String): The type of stream this table will provide. [Default: 'NEW_IMAGE']
   - options are (choose one): 'NEW_IMAGE | OLD_IMAGE | NEW_AND_OLD_IMAGES | KEYS_ONLY'
@returns this DynaClient (builder model)
**/
DyModel.prototype.setDynamoStreams = function setDynamoStreams(streamEnabled, streamType) {
    if (arguments.length < 1) {
        throw Util.createError('setDynamoStreams() must have at least one argument (streamEnabled)!');
    }
    if (this.updateIOPSLock) {
        //DynamoDB does not allow you to update Streams while IOPS on the table are changed.
        throw Util.createError('setDynamoStreams(): You cannot update the table\'s or indexe\'s IOPs and change streams in the same call.');
    }
    //We should enable streams on this table.
    this.tablePayload[Util.KEY_TABLE_DYNAMO_STREAMS_SPEC] = {};
    var streamSpec = this.tablePayload[Util.KEY_TABLE_DYNAMO_STREAMS_SPEC];
    streamSpec[Util.KEY_TABLE_DYNAMO_STREAMS_ENABLED] = streamEnabled;
    //If streamEnabled is false, then we never specify the type.
    if (streamEnabled) {
        //Default the type to NEW_IMAGE
        if (typeof streamType === "undefined") {
            streamType = 'NEW_IMAGE';
        }
        streamSpec[Util.KEY_TABLE_DYNAMO_STREAMS_TYPE] = streamType;
    }

    return this;
}


/**
Reinitializes the DyModel object.
IF this is called again, the object is wiped and must be re-established.
Note that this does not change the createLock state. You cannot call
createTable() twice as we assume the table was already created (granted it
succeeded).
**/
DyModel.prototype.resetTablePayload = function resetTablePayload() {
    /*
    Once this model has been created, lets make all the necessary calls to
    create the table and what not.
    */
    this.tablePayload = {};
    this.tablePayload.TableName = this.modelName;
    this.updateIOPSLock = false;
    return this;
}

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
DyModel.prototype.buildUpdate = function buildUpdate(newObject, options) {
    return new SmartUpdate(this.dynamoDoc, this.dyModel, newObject, options);
}

/**
The Joi Validate method against this DyModel object.
@param object (Object): The item to validate against this model.
@param options (object): Joi Options for validate.
@param callback (function): Function to callback from the Joi validation.
@return JoiResult (Object): Joi object that has both a error and value
  property. If error is defined, then there was an error. Value is the
  valid object.
**/
DyModel.prototype.validate = function validate(object, options, callback) {
    return Joi.validate(object, this.model, options, callback);
}

/**
The Joi assert method. Throws validation error if validation fails.
Returns nothing.
@param object (Object): The item to validate against this model.
@param message (String):  Optional message to display if validation fails.
**/
DyModel.prototype.assert = function assert(object, message) {
    Joi.assert(object, this.model, message);
    return this;
}

/**
The Joi attempt method. Throws validation error if validation fails.
Also returns the valid object.
@param object(Object): The item to validate against this model.
@param message (String):  Optional message to display if validation fails.
@return item (object): The valid object that passed validation.
**/
DyModel.prototype.attempt = function attempt(object, message) {
    return Joi.attempt(object, this.model, message);
}

module.exports = DyModel;

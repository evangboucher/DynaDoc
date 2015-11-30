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

- Ability to create a DynamoDB table from a Joi schema (DONE)
- Ability to create indexes (and local secondary indexes from the origina Joi
   schema). (DONE)
- Validate input automatically in DynaDoc calls (against the model)
- Relationships between models/tables??? (Maybe...stretch)
**/

var path = require('path');
//@TODO Validate that this will work everywhere.
const LIB_FOLDER = __dirname + "/../" ;
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

var Q = require('q');

var Joi = require('joi');

var ModelValidatorHelper = require(path.join(__dirname, "./modelValidator"));
var CreateIndexHelper = require(path.join(__dirname, "./createIndex"));

var MAX_THROUGHPUT = 20000;
var MIN_THROUGHPUT = 1;

const DEFAULT_READ_THROUGHPUT = 50;
const DEFAULT_WRITE_THROUGHPUT = 10;


//Here we create a new DyModel object to parse.

/**
Constructor for a DyModel which is the object that represents the data
inside a table in DynamoDB. This object will have access to the DynamoDB
SDK related to the table (@TODO should be shared not new).

@param modelName (String): The name of the model that this object represents.
The table name will likely follow this name unless overridden.
@param model (Object): The Joi schema that this model represents.
@param dynamoDB (Object): The DynamoDB JavaScript SDK object.
**/
function DyModel(modelName, model, dynamoDB, readThroughput, writeThroughput) {
    //Create a new DyModel
    //model is the Joi schema for this model.
    this.model = model;
    this.modelName = modelName;
    this.MAX_THROUGHPUT = MAX_THROUGHPUT;
    this.dynamoDB = dynamoDB
    if (readThroughput) {
        this.readThroughput = readThroughput;
    } else {
        this.readThroughput = DEFAULT_READ_THROUGHPUT;
    }

    if (writeThroughput) {
        this.writeThroughput = writeThroughput;
    } else {
        this.writeThroughput = DEFAULT_WRITE_THROUGHPUT;
    }

    this.tablePayload = {};
    this.tablePayload.TableName = modelName;
    this.createLock = false;
    this.init();
    //Once we have parsed the Joi model, we can set the ProvisionedThroughput.
    this.setTableThroughput(this.readThroughput, this.writeThroughput);
}


/**
Prints out the model in a simple way.
**/
DyModel.prototype.toSimpleObject = function toSimpleObject() {
    return {
        "modelName": this.modelName,
        "model": this.dyModel,
        "MAX_THROUGHPUT": MAX_THROUGHPUT,
        "readThroughput": this.readThroughput,
        "writeThroughput": this.writeThroughput
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
Returns true or false if the given throughput is less than the max throughput
True if less than or equal too, false otherwise
**/
function checkMaxThroughput(throughput) {
    return throughput <= this.MAX_THROUGHPUT;
}

/**
Sets the current tablePayload ProvisionedThroughput object to
the given read and write throughput values.
**/
function setThroughput(tableCreationPayload, readThroughput, writeThroughput) {

    tableCreationPayload.ProvisionedThroughput = {"ReadCapacityUnits":readThroughput, "WriteCapacityUnits":writeThroughput};
}
/**
Creates the full ProvisionedThroughput object with the given readThroughput
and writeThroughput
**/
function createThroughputItem(readThroughput, writeThroughput) {

    //@TODO Validate the params to be whole numbers greater than 0
    Joi.assert(readThroughput,Joi.number().integer().min(MIN_THROUGHPUT).max(this.MAX_THROUGHPUT));
    Joi.assert(writeThroughput,Joi.number().integer().min(MIN_THROUGHPUT).max(this.MAX_THROUGHPUT));
    return {"ProvisionedThroughput":{"ReadCapacityUnits":readThroughput, "WriteCapacityUnits":writeThroughput}};
}

/*
Sets the read and write throughput for this tablePayload.
@param readThroughput (integer): Sets the read throughput for the table payload.
@param writeThroughput (integer): Sets the write throughput for the table payload.
*/
DyModel.prototype.setTableThroughput = function setTableThroughput(readThroughput, writeThroughput) {

    //These assertions will fail if the user passes in bad input.
    Joi.assert(readThroughput,Joi.number().integer().min(MIN_THROUGHPUT).max(MAX_THROUGHPUT));
    Joi.assert(writeThroughput,Joi.number().integer().min(MIN_THROUGHPUT).max(MAX_THROUGHPUT));
    this.readThroughput = readThroughput;
    this.writeThroughput = writeThroughput;
    setThroughput(this.tablePayload, readThroughput, writeThroughput);
}

/**
Returns the given throughput for the current Table.
**/
DyModel.prototype.getThroughput = function getThroughput() {
    return createThroughputItem(this.readThroughput, this.writeThroughput).ProvisionedThroughput;
}


/**
Set the max throughput for the given table.
**/
DyModel.prototype.setMaxThroughput = function setMaxThroughput(max) {
    Joi.assert(max, Joi.number().integer().min(MIN_THROUGHPUT));
    this.MAX_THROUGHPUT = max;
}

/**
Update the Model that this table refers too.
THis reinitalizes the entire object.
@TODO This method may not be a good idea.
**/
DyModel.prototype.updateModel = function updateModel(model) {
    this.model = model;
    this.init();
}

//Validate the given object against this model.
DyModel.prototype.validate = function validate(object) {
    return ModelValidatorHelper.validate(object,this.model);
}

/**
Create the primary Index. You must call this and call it first!
@param hashKey (String): The name of your hashkey in your Joi model.
@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
**/
DyModel.prototype.ensurePrimaryIndex = function ensurePrimaryIndex(hashKey, rangeKey) {
    if (this.createLock === true) {
        throw Util.createError('ensurePrimaryIndex was called after the table was created!')
    }
    var indexObject = CreateIndexHelper.createIndexObject(hashKey, rangeKey);
    CreateIndexHelper.addPrimaryIndex(this.tablePayload, indexObject, this.dyModel);

}

/**
Ensures that a global index or the indexobject passed in will be created.
@param hashKey (String): The name of your hashkey in your Joi model.
@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
@param readCapacity (Integer): Read throughput for DynamoDB index.
@param writeCapacity (Integer): The write throughput for DynamoDB index.
@param indexName (String): The name that you want to refer to this index as.
**/
DyModel.prototype.ensureGlobalIndex = function ensureLocalIndex(hashKey, rangeKey, readCapacity, writeCapacity, indexName) {
    if (this.createLock === true) {
        throw Util.createError('ensureGlobalIndex was called after the table was created!')
    }
    var indexObject = CreateIndexHelper.createIndexObject(hashKey, rangeKey);
    CreateIndexHelper.addGlobalIndex(this.tablePayload, indexObject, this.dyModel, readCapacity, writeCapacity, indexName);
}
/**
Ensures that a secondary local index or the indexobject passed in will be
created. The hashKey is always the primary hash key. THis means that the primary
index must be ensured before any local indexes.

@param rangeKey (String): The name of the range key in your Joi model (optional)
   Leave as Undefined if you do not want to specify a range Key
@param indexName (String): The name you want to refer to this index as.
**/
DyModel.prototype.ensureLocalIndex = function ensureLocalIndex(rangeKey, indexName) {
    if (this.createLock === true) {
        throw Util.createError('DynaDoc: ensureLocalIndex was called after the table was created!');
    }
    var indexObject = CreateIndexHelper.createIndexObject(this.dyModel[Util.PRIMARY_INDEX_PLACEHOLDER][Util.constants.INDEX_PRIMARY_HASH], rangeKey);
    CreateIndexHelper.addLocalIndex(this.tablePayload, indexObject, this.dyModel, indexName);

}

/**
Given the current PayloadObject, update the table.
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
        //Resolve the promise.
        d.resolve(res);
        //Here lets re-init the table. SO the next update is clean.
        that.init();
    });
    return d.promise;

}

/**
Reinitializes the DyModel object.
IF this is called again, the object is wiped and must be re-established.
**/
DyModel.prototype.init = function init() {
    /*
    Once this model has been created, lets make all the necessary calls to
    create the table and what not.
    */
    this.dyModel = ModelValidatorHelper.parseJoiSchema(this.model);
    this.tablePayload = {};
    this.tablePayload.TableName = this.modelName;
}

/**
The Joi Validate method against this DyModel object.
@param item (Object): The item to validate against this model.
@param options (object): Joi Options for validate.
@param callback (function): Function to callback from the Joi validation.
@return JoiResult (Object): Joi object that has both a error and value
  property. If error is defined, then there was an error. Value is the
  valid object.
**/
DyModel.prototype.validate = function validate(item, options, callback) {
    return Joi.validate(item, this.model, options, callback);
}

/**
The Joi assert method. Throws validation error if validation fails.
Returns nothing.
@param item (Object): The item to validate against this model.
@param message (String):  Optional message to display if validation fails.
**/
DyModel.prototype.assert = function assert(item, message) {
    Joi.assert(item, this.model, message);
}

/**
The Joi attempt method. Throws validation error if validation fails.
Also returns the valid object.
@param item (Object): The item to validate against this model.
@param message (String):  Optional message to display if validation fails.
@return item (object): The valid object that passed validation.
**/
DyModel.prototype.attempt = function attempt(item, message) {
    return Joi.attempt(item, this.model, message);
}


module.exports = DyModel;

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

- Ability to create a DynamoDB table from a Joi schema
- Ability to create indexes (and local secondary indexes from the origina Joi
   schema).
- Validate input automatically in DynaDoc calls (against the model)
- Relationships between models/tables??? (Maybe...stretch)
- Reverse relationship between DynaDoc and DyModel? So that a DyModel can be
  a proper ORM. (Stretch, but not sure if it is necessary. Will wait to get
  feedback from users on this).


  @TODO Read ASAP

  I think that we need to change the way DynaDoc works to better Support
  models. This may require the use of something like underscore.js
  to attach model functions statically to the DynaDoc required object.
**/

var path = require('path');
//@TODO Validate that this will work everywhere.
const LIB_FOLDER = __dirname + "/../" ;
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

var Q = require('q');

var CreateTableHelper = require(path.join(__dirname, "./createTable"));
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
    this.readThroughput = readThroughput;
    this.writeThroughput = writeThroughput;
}

/*
Sets the read and write throughput for this table.
We should know if this changes.
If we update the table, there should be some secure way to make it happen.
*/
DyModel.prototype.setThroughput = function setThroughput(readThroughput, writeThroughput) {
    //These assertions will fail if the user passes in bad input.
    Joi.assert(readThroughput,Joi.number().integer().min(MIN_THROUGHPUT).max(MAX_THROUGHPUT));
    Joi.assert(writeThroughput,Joi.number().integer().min(MIN_THROUGHPUT).max(MAX_THROUGHPUT));
    this.readThroughput = readThroughput;
    this.writeThroughput = writeThroughput;
}

DyModel.prototype.getThroughput = function getThroughput() {
    return this.createThroughputItem(this.readThroughput, this.writeThroughput);
}

DyModel.prototype.setMaxThroughput = function setMaxThroughput(max) {
    Joi.assert(max, Joi.number().integer().min(MIN_THROUGHPUT));
    this.MAX_THROUGHPUT = max;
}

DyModel.prototype.createThroughputItem = function createThroughputItem(readThroughput, writeThroughput) {
    //@TODO Validate the params to be whole numbers greater than 0
    Joi.assert(readThroughput,Joi.number().integer().min(MIN_THROUGHPUT).max(this.MAX_THROUGHPUT));
    Joi.assert(writeThroughput,Joi.number().integer().min(MIN_THROUGHPUT).max(this.MAX_THROUGHPUT));
    return {"ProvisionedThroughput":{"ReadCapacityUnits":readThroughput, "WriteCapacityUnits":writeThroughput}};
}

DyModel.prototype.updateModel = function updateModel(model) {
    this.model = model;
}
//Validate the given object against this model.
DyModel.prototype.validate = function validate(object) {
    return ModelValidatorHelper.validate(object,this.model);
}

/**
Create Global Secondary Indexes for this table. This stricly uses the Create
option (not used for updating).
The indexArray determines the keys that will be used for an index.
The Hash Key (concatinated with a '-' + range when available) will be the name
of the index (with -index appended to it). THe indexArray following the
format of:
[{
    "hashKey":"<NameOfHashKeyInModel>",
    "rangeKey":"<NameOfRangeKeyInModel>"
}, <Repeat per index>]

All indexes created this way are using the update function. This means that
they will always be global secondary indexes.
**/
DyModel.prototype.createGlobalIndexes = function createGlobalIndexes(indexArray, readCapacity, writeCapacity) {
    //Using the updateTable call we can produce payloads to
    var payload = CreateIndexHelper.generatePayload(indexName, this.model, readCapacity, writeCapacity);
}

DyModel.prototype.init = function init() {
    /*
    Once this model has been created, lets make all the necessary calls to
    create the table and what not.
    */

}

module.exports = DyModel;

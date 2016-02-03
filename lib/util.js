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

Utility functions for use within DynaDoc.

@author: Evan Boucher
@copyright: Mohu Inc.
**/
var path = require('path');
const LIB_FOLDER = __dirname;
//Get the DynaDoc utilities.
var Constants = require(path.join(LIB_FOLDER, "constants.js"));

var Joi = require('joi');

var util = {};
util.constants = Constants;


//This may be better in a const file.
const PAYLOAD_HASH_NAME_KEY = "#hName";
const PAYLOAD_HASH_VALUE_KEY = ":hValue";
const PAYLOAD_RANGE_NAME_KEY = "#rName";
const PAYLOAD_RANGE_VALUE_KEY = ":rValue";
const PAYLOAD_RANGE_UPPER_NAME_KEY = "#rUValue";
const PAYLOAD_RANGE_UPPER_VALUE_KEY = ":rUValue";

const PRIMARY_INDEX_PLACEHOLDER = "PrimaryIndex";

const ERROR_VALIDATION_MESSAGE_PREFIX = "DynaDocValidation: ";

const KEY_TABLE_DYNAMO_STREAMS_SPEC = "StreamSpecification";
const KEY_TABLE_DYNAMO_STREAMS_ENABLED = "StreamEnabled";
const KEY_TABLE_DYNAMO_STREAMS_TYPE = "StreamViewType";

util.KEY_TABLE_DYNAMO_STREAMS_SPEC = KEY_TABLE_DYNAMO_STREAMS_SPEC;
util.KEY_TABLE_DYNAMO_STREAMS_ENABLED = KEY_TABLE_DYNAMO_STREAMS_ENABLED;
util.KEY_TABLE_DYNAMO_STREAMS_TYPE = KEY_TABLE_DYNAMO_STREAMS_TYPE;


util.PAYLOAD_HASH_NAME_KEY = PAYLOAD_HASH_NAME_KEY;
util.PAYLOAD_HASH_VALUE_KEY = PAYLOAD_HASH_VALUE_KEY;
util.PAYLOAD_RANGE_NAME_KEY = PAYLOAD_RANGE_NAME_KEY;
util.PAYLOAD_RANGE_VALUE_KEY = PAYLOAD_RANGE_VALUE_KEY;
util.PAYLOAD_RANGE_UPPER_NAME_KEY = PAYLOAD_RANGE_UPPER_NAME_KEY;
util.PAYLOAD_RANGE_UPPER_VALUE_KEY = PAYLOAD_RANGE_UPPER_VALUE_KEY;
util.PRIMARY_INDEX_PLACEHOLDER = PRIMARY_INDEX_PLACEHOLDER;


const JOI_STRING = "string";
const JOI_DATE = "string";
const JOI_NUMBER = "number";
const JOI_ARRAY = "array";
const JOI_OBJECT = "object";

const DYNAMO_STRING = "S";
const DYNAMO_DATE = "S";
const DYNAMO_NUMBER = "N";
const DYNAMO_BINARY = "B";
const DYNAMO_MAP = "M";
const DYNAMO_NUMBER_SET = "NS";
const DYNAMO_LIST = "L";
const DYNAMO_BOOL = "BOOL";
const DYNAMO_NULL = "NULL";

const STATUS_CREATING = "CREATING";
const STATUS_UPDATING = "UPDATING";
const STATUS_DELETING = "DELETING";
const STATUS_ACTIVE = "ACTIVE";

const ERROR_GLOBAL_PREFIX = "DynaDoc: ";
/**
    Get the Indexes object for
**/
util.getIndexes =  function getIndexes(settings) {
    if (!settings.hasOwnProperty("Indexes")) {
        settings.Indexes = {};
    }
    return settings.Indexes;
}

//Merges two objects together.
util.mergeObject = function mergeObject(first, second) {
    //Merge the second object into the first one.
    for(var key in second) {
        first[key] = second[key];
    }
    return first;
}

/**
Convert a Joi string type to a dynamoDB data type.
**/
util.convertTypeToDynamoType = function convertTypeToDynamoType(stringType) {
    if (stringType === JOI_STRING) {
        return DYNAMO_STRING;
    } else if (stringType === JOI_NUMBER) {
        return DYNAMO_NUMBER
    } else if (stringType === JOI_DATE) {
        return DYNAMO_STRING;
    } else if (stringType === JOI_ARRAY) {
        return DYNAMO_LIST;
    } else if (stringType === JOI_OBJECT) {
        return DYNAMO_MAP;
    } else {
        //For now lets default values to a string.
        //@TODO Maybe this should throw an error.
        return DYNAMO_STRING;
    }
}
const TYPE_OF_NUMBER = "number";
const TYPE_OF_STRING = "string";
const TYPE_OF_BOOLEAN = "boolean";
const TYPE_OF_OBJECT = "object";
const TYPE_OF_FUNCTION = "function";

/**
Checks if the given string type is a type of list for DynamoDB.

Returns true if it is a list/array type, false otherwise.
**/
util.isDynamoListType = function isDynamoListType(stringType) {
    if (stringType === DYNAMO_LIST) {
        return true;
    }
    return false;
}

/**
Return the primary index object from a dyModel.
@param dyModel
**/
util.getPrimaryIndexFromModel = function getPrimaryIndexFromModel(dyModel) {
    return dyModel[PRIMARY_INDEX_PLACEHOLDER];
}

/**
Checks if the given status string is active or not.
True if it is active and false otherwise.
@param status (string): The string status of the table.
@return boolean True if the status was active, false otherwise.
**/
util.checkTableStatusActive = function checkTableStatusActive(status) {
    return STATUS_ACTIVE === status;
}

/**
Creates a standard error for DynaDoc. Attaches the global prefix.
@param message (String): Error message string that will be displayed with the
  error.
**/
util.createError = function createError(message) {
    return new Error(ERROR_GLOBAL_PREFIX + message);
}

/**
Creates the full ProvisionedThroughput object with the given readCapacity
and writeCapacity
@param readCapacity (integer): Integer between the min (1) and max throughput for read capacity
@param writeCapacity (integer): Integer between the min (1) and max throughput for write capacity.
@returns ProvisionedThroughput (Object): Object with a root element
   ProvisionedThroughput, which contains DynamoDB syntax for provisioned
   throughput.
**/
util.createThroughputItem = function createThroughputItem(readCapacity, writeCapacity) {

    return {"ProvisionedThroughput":{"ReadCapacityUnits":readCapacity, "WriteCapacityUnits":writeCapacity}};
}


/**
Adds AWS dynamoDB options defined in the options parameter
to the payload object.

@param payload (Object): The payload that the options will be added to.
@param options (Object): The options that the payload will recieve.

Options:
ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
ForceValidation: true | false
DefaultProject: KEYS_ONLY | INCLUDE | ALL
NonKeyAttributes: Array of Strings when Project is INCLUDE.
    Strings are the attribute names to project into the index.

**/
util.addOptionsToPayload = function addOptionsToPayload(payload, options) {
    /*
    Return Value is limited in some calls such as Scan, Query, Get, CreateSet, batchWrite, batchGet
    Only usable in: Put, Update, and Delete.
    Need to check and make sure it is not sent otherwise DynamoDB will return validation Errors.
    */
    if (options.hasOwnProperty("ReturnValues")) {
        payload.ReturnValues = options.ReturnValues;
    }
    //Check if they want to get Returned consumedCapacity
    /*
    Availalbe in every method but CreateSet. (CreateSet will likely not be implemented).
    */
    if (options.hasOwnProperty("ReturnConsumedCapacity")) {
        payload.ReturnConsumedCapacity = options.ReturnConsumedCapacity;
    }

    //Option to return Item collection Metrics.
    /*
    Use only in: batchWrite, Put, Delete, and Update.
    Not availalbe in other methods.
    */
    if (options.hasOwnProperty("ReturnItemCollectionMetrics")) {
        payload.ReturnItemCollectionMetrics = options.ReturnItemCollectionMetrics;
    }
    /*
    Set the default limit of items returned.
    */
    if (options.hasOwnProperty("Limit")) {
        payload.Limit = options.Limit;
    }

    if (options.hasOwnProperty("ScanIndexForward")) {
        payload.ScanIndexForward = options.ScanIndexForward;
    }

    if(options.hasOwnProperty("AttributesToGet")) {
        payload.AttributesToGet = options.AttributesToGet;
    }

    if(options.hasOwnProperty("Select")) {
        payload.Select = options.Select
    }

    if (options.hasOwnProperty("ReadCapacityUnits")) {
        payload.ReadCapacityUnits = options.ReadCapacityUnits;
    }

    if (options.hasOwnProperty("WriteCapacityUnits")) {
        payload.WriteCapacityUnits = options.WriteCapacityUnits;
    }
}


module.exports = util;

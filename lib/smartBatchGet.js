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


Functions for creating a smart payload for a batch get.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

var path = require('path');
const LIB_FOLDER = __dirname;
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

var SmartBatchGetHelper = {};

//These are a part of the payload for batchWrite.
const REQUEST_ITEM_KEY = "RequestItems";

/**
Function will create a payload for a batchGet request given the following
parameters.

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
SmartBatchGetHelper.createPayload = function createPayload(arrayOfTableNames, batchGetKeyObject) {
    var payload = {};

    payload[REQUEST_ITEM_KEY] = {};
    //Go through each name in the table name array.
    for (var tableName in arrayOfTableNames) {
        //For each item in the array of Table Names, lets get its list of items to put.
        var putItemArray = batchGetKeyObject[arrayOfTableNames[tableName]];
        if (!putItemArray) {
            //This tableName does not exist in the object.
            throw new Error('smartBatchWrite Error. Table Name did not exist in the putItems Object.');
        }
        var payloadPutArray = [];
        for(var putObject in putItemArray) {
            payloadPutArray.push(putItemArray[putObject]);
        }
        //Add the get item array to the table Name with the Value Keys to point to the get Object
        payload[REQUEST_ITEM_KEY][arrayOfTableNames[tableName]] = {"Keys":payloadPutArray};
    }
    return payload;
}


module.exports = SmartBatchGetHelper;

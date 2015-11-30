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



@TODO We may not be able to validate batch write requests as they involve
seperate tables. Each object will not have the other table's model.
I will have to make a decision to either expose the validation and/or
force batchWrite to only write to its own table.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

var path = require('path');
const LIB_FOLDER = __dirname;
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));


var batchWriteData = {};
//These are a part of the payload for batchWrite.
const REQUEST_ITEM_KEY = "RequestItems";
//These are not used yet.
const PUT_REQUEST_KEY = "PutRequest";
//@TODO Need to implement the difference between delete and put requests.
const DELETE_REQUEST_KEY = "DeleteRequest";
const ITEM_REQUEST_KEY = "Item";

/**
This function will create the smart payload given the following
params. This function supports both PutRequest and DeleteRequest.
You must pass seperate objects in as parameters for PutRequests and
DeleteRequest. Make sure that table names match the object keys.


@params arrayOfTableNames (Array): Array of the table names that will be
  affected.
@params putItemsObject (Object): An object whos Keys are tableNames and values
   are arrays of objects to put into each table.

   putItemsObject = {
   <TableName1>:[{<DocumentToPut},{<DocumentToPut},{<DocumentToPut}, etc...],
   <TableName2>:[{<DocumentToPut},{<DocumentToPut},{<DocumentToPut}, etc...],
}

@params deleteItemObject (Object): An object whos keys are TableNames and values
are arrays of key objects of documents that should be removed from that table.
The object structure is identical to putItemObject, but the items inside the
array should only have the Hash and Range key-values if applicable.
**/
batchWriteData.smartBatchWrite = function smartBatchWrite(arrayOfTableNames, putItemsObject, deleteItemObject) {
    var payload = {};
    payload[REQUEST_ITEM_KEY] = {};
    //Go through each name in the table name array.
    for (var tableName in arrayOfTableNames) {
        //For each item in the array of Table Names, lets get its list of items to put.
        var tableRequestArray = [];
        //Check if we are being asked to put anything.
        if (putItemsObject) {
            var putItemArray = putItemsObject[arrayOfTableNames[tableName]];
            if (!tableRequestArray) {
                //This tableName does not exist in the object.
                //throw new Error('smartBatchWrite Error. Table Name did not exist in the putItems Object.');
                /*
                For now lets not do anything. Maybe we should have a strict
                mode to throw the above error. This is not really an error
                though.
                */
            } else {
                //Setup the putObject Requests
                for (var putObject in putItemArray) {
                    /*
                    @TODO Validate the putObject with DyModel.
                    */
                    tableRequestArray.push({
                        "PutRequest": {
                            "Item": putItemArray[putObject]
                        }
                    });
                }
            }
        }
        /*
        Check if the delete Object exists, if it does not, then this request
        won't delete anything.
        */
        if (deleteItemObject) {
            var deleteItemArray = deleteItemObject[arrayOfTableNames[tableName]];
            if (!deleteItemArray) {
                //This tableName does not exist in the object.
                //throw new Error('smartBatchWrite Error. Table Name did not exist in the deleteItems Object.');
                /*
                For now lets not do anything. Maybe we should have a strict
                mode to throw the above error. This is not really an error
                though.
                */
            } else {
                //Setup the putObject Requests
                for (var deleteObject in deleteItemArray) {
                    tableRequestArray.push({
                        "DeleteRequest": {
                            "Key": deleteItemArray[deleteObject]
                        }
                    });
                }
            }
        }
        payload[REQUEST_ITEM_KEY][arrayOfTableNames[tableName]] = tableRequestArray;
    }
    return payload;
}

module.exports = batchWriteData;

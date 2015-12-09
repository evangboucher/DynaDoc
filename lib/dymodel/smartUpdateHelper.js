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


Functions for smartUpdate functionality.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

var SmartUpdateHelper = {};

var path = require('path');
const LIB_FOLDER = __dirname + "/../";
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));
var CONSTANTS = require(path.join(LIB_FOLDER, "constants"));

const KEY_ATTRIBUTE_UPDATES = "AttributeUpdates";
const KEY_ATTRIBUTE_VALUE = "Value";
const KEY_ATTRIBUTE_ACTION = "Action";

const KEY_ACTION_PUT = "PUT";
const KEY_ACTION_ADD = "ADD";
const KEY_ACTION_DELETE = "DELETE";

/**
Returns true if the given key is a primary key in the dyModel.
**/
function isPrimaryKey(key, dyModel) {
    if (key === dyModel[Util.PRIMARY_INDEX_PLACEHOLDER][CONSTANTS.INDEX_PRIMARY_HASH]) {
        return true;
    } else if(key === dyModel[Util.PRIMARY_INDEX_PLACEHOLDER][CONSTANTS.INDEX_PRIMARY_RANGE]) {
        return true;
    }
    return false;
}
/**
Takes the given payload object and turns it into a update call with the given
parameters and options. smartUpdate will only support the 'PUT' option
for right now. This means that the new item can only contain things that
already exists and are a part of the DyModel.

@param payload (Object): Object that will be modified to contain the update payload.
@param dyModel (Object): The dyModel that represents this table.
@param newObject (Object): The new object that will take the place of the old
   object. Each key in the newObject will be PUT to DynamoDB table replaced
   what was already in dynamoDB.
@param options (Object): Options object for this call.
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
    - AddToArrays: true | false [Default: false]
    - DeleteMissingKeys: true | false [Default: false]

**/
SmartUpdateHelper.smartUpdate = function smartUpdate(payload, dyModel, newObject, options) {
    payload.Key = {};
    console.log('The DyModel object in smartUpdate():');
    console.log(JSON.stringify(dyModel, null, 4));
    if (!dyModel[Util.PRIMARY_INDEX_PLACEHOLDER]) {
        //smartUpdate can only be used when ensurePrimary index has been called.
        throw Util.createError('smartUpdate() cannot be used without call ensurePrimary() first.');
    }
    //Construct the key object for the payload.
    var primaryIndexObject = dyModel[Util.PRIMARY_INDEX_PLACEHOLDER];
    //Add the name of the primaryHash value to the Keyobject and put the value passed in.
    payload.Key[primaryIndexObject[CONSTANTS.INDEX_PRIMARY_HASH]] = newObject[primaryIndexObject[CONSTANTS.INDEX_PRIMARY_HASH]];
    payload.Key[primaryIndexObject[CONSTANTS.INDEX_PRIMARY_RANGE]] = newObject[primaryIndexObject[CONSTANTS.INDEX_PRIMARY_RANGE]];

    payload[KEY_ATTRIBUTE_UPDATES] = {};
    var updateObject = payload[KEY_ATTRIBUTE_UPDATES];

    /*
    Look through the new object with each key.

    @TODO We should determine if the key is an array/List. If so, we should
    use the ADD Action instead of Put.
    */
    for (var key in newObject) {
        //Skip primary keys, we do not want to update them.
        if (isPrimaryKey(key, dyModel)) {
            continue;
        }
        //For each key lets add a new item to the updates object.
        updateObject[key] = {};

        updateObject[key][KEY_ATTRIBUTE_ACTION] = KEY_ACTION_PUT;
        updateObject[key][KEY_ATTRIBUTE_VALUE] = newObject[key];
    }

    //If options are provided then add them too.
    if (options) {
        Util.addOptionsToPayload(payload, options);
    }
    console.log('The payload after smartUpdate()');
    console.log(JSON.stringify(payload, null, 4));
}

module.exports = SmartUpdateHelper;

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

const KEY_UPDATE_EXPRESSION = "UpdateExpression";
const KEY_EXPRESSION_ATTRIBUTE_VALUES = "ExpressionAttributeValues";
const KEY_EXPRESSION_ATTRIBUTE_NAMES = "ExpressionAttributeNames";

const KEY_ACTION_PUT = "PUT";
const KEY_ACTION_ADD = "ADD";
const KEY_ACTION_DELETE = "DELETE";

/**
REMOVE and SET are actions specifically for updateExpression.
**/
const KEY_ACTION_REMOVE = "REMOVE";
const KEY_ACTION_SET = "SET";

const OPTIONS_DELETE_KEYS = "DeleteKeys";
const OPTIONS_ADD_TO_ARRAYS = "AddToArrays";
const OPTIONS_ADD_MISSING_KEYS = "AddMissingKeys";

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

This is for use only for the AttributeUpdates options.
Attribute Updates is now legacy for DynamoDb so we will not use it.
**/
function addUpdateKey(updateObject, key, value, action) {
    //If it does not already exist, lets make the object definition.
    if (!updateObject[key]) {
        updateObject[key] = {};
    }
    //Put the update fields in the attribute definition.
    updateObject[key][KEY_ATTRIBUTE_ACTION] = action;
    updateObject[key][KEY_ATTRIBUTE_VALUE] = value;
}
/**
Generates and adds the Key field to the payload (includes necessary primary)
indexes.
**/
SmartUpdateHelper.generateKeyField = function generateKeyField(payload, dyModel, newObject) {
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
}

SmartUpdateHelper.addExpressionAttributesName = function addExpressionAttributesName(payload, key, nameAlias) {
    if (!payload[KEY_EXPRESSION_ATTRIBUTE_NAMES]) {
        payload[KEY_EXPRESSION_ATTRIBUTE_NAMES] = {};
    }
    payload[KEY_EXPRESSION_ATTRIBUTE_NAMES][nameAlias] = key;
}

SmartUpdateHelper.addExpressionAttributesValue = function addExpressionAttributesValue(payload, value, valueAlias) {
    if (!payload[KEY_EXPRESSION_ATTRIBUTE_VALUES]) {
        payload[KEY_EXPRESSION_ATTRIBUTE_VALUES] = {};
    }

    var dataType = Util.getVariableDataType(value);
    //Harder than name since we have to determine the type.
    payload[KEY_EXPRESSION_ATTRIBUTE_VALUES][valueAlias] = value;
    /* My initial thought of how expression values should be done.
    payload[KEY_EXPRESSION_ATTRIBUTE_VALUES][valueAlias] = {};
    payload[KEY_EXPRESSION_ATTRIBUTE_VALUES][valueAlias][dataType] = value;
    */
}

/**
Adds the newObject Value and key to the expressionAttribute fields for the payload.
The expression Name and value are the key value with a '#' as a prefix for name
and a ':' as a prefix for value. This is a standard for DynamoDB.
@param payload (Object): The update object that the expression attributes are added to.
@param newObject (Object): The DynamoDB object that we will update.
@param key (string): Key value for the value that will be updated.
**/
SmartUpdateHelper.addExpressionAttributes = function addExpressionAttributes(payload, newObject, key, nameAlias, valueAlias) {
    this.addExpressionAttributesName(payload, key, nameAlias);
    this.addExpressionAttributesValue(payload, newObject[key], valueAlias);
}


/**
Takes the given payload object and turns it into a update call with the given
parameters and options. smartUpdate will only support the 'PUT' option
for right now. This means that the new item can only contain things that
already exists and are a part of the DyModel.

SmartUpdate does not work for nested objects! The entire nested object
will be replaced! Only root objects are updated right now.

@param payload (Object): Object that will be modified to contain the update payload.
@param dyModel (Object): The dyModel that represents this table.
@param newObject (Object): The new object that will take the place of the old
   object. Each key in the newObject will be PUT to DynamoDB table replaced
   what was already in dynamoDB.
@param options (Object): Options object for this call.
    - ReturnValues: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    - ReturnConsumedCapacity: 'INDEXES | 'TOTAL' | 'NONE'
    - ReturnItemCollectionMetrics: 'SIZE' | 'NONE'
    - AddToArrays: true | false [Default: false] : Instead of replacing items in
        and array, the items in the new object will be added to the array. Default
        action is to replace the array.
    - DeleteKeys: true | false [Default: false] : Any key provided in the newObject
        will be deleted from the Table (Primary Keys are not deleted). For arrays
        the entire key/value pair is removed. If this setting is provided, then
        the other options (AddToArrays and AddMissingKeys) are ignored.
    - AddMissingKeys: true | false [Default: false] : Any key in the newObject
        which is not in the Table Schema will be added if true. Ignored if false.

**/
SmartUpdateHelper.smartUpdateAttributeUpdates = function smartUpdateAttributeUpdates(payload, dyModel, newObject, options) {
    this.generateKeyField(payload, dyModel, newObject);

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

        //Check if the key exists in our schema.
        if (dyModel[key]) {
            //The key exists in the schema.
            if (options[OPTIONS_DELETE_KEYS]) {
                //We need to delete every key we find in the object.
                addUpdateKey(updateObject, key, newObject[key], KEY_ACTION_DELETE);
                continue;
            }
            if (Util.isDynamoListType(dyModel[key].type)) {
                //Check if the user wants to add to arrays or replace them.
                if (options[OPTIONS_ADD_TO_ARRAYS]) {
                    //The given key is indeed an array.
                    addUpdateKey(updateObject, key, newObject[key], KEY_ACTION_ADD);
                } else {
                    addUpdateKey(updateObject, key, newObject[key], KEY_ACTION_PUT);
                }
                continue;
            }
        //else key is not in the Table Schema.
        } else {
            //The key does not exist in the schema.
            if (options[OPTIONS_ADD_MISSING_KEYS]) {
                //The user wants us to add missing keys.
                addUpdateKey(updateObject, key, newObject[key], KEY_ACTION_ADD);
                continue;
            }
        }
    }

    //If options are provided then add them too.
    if (options) {
        Util.addOptionsToPayload(payload, options);
    }
    console.log('The payload after smartUpdate()');
    console.log(JSON.stringify(payload, null, 4));
}


module.exports = SmartUpdateHelper;

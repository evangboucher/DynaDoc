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

const KEY_UPDATE_EXPRESSION = "UpdateExpression";
const KEY_EXPRESSION_ATTRIBUTE_VALUES = "ExpressionAttributeValues";
const KEY_EXPRESSION_ATTRIBUTE_NAMES = "ExpressionAttributeNames";


/**
Generates and adds the Key field to the payload (includes necessary primary)
indexes.
**/
SmartUpdateHelper.generateKeyField = function generateKeyField(payload, dyModel, newObject) {
    payload.Key = {};
    if (!dyModel.hasOwnProperty(Util.PRIMARY_INDEX_PLACEHOLDER)) {
        //smartUpdate can only be used when ensurePrimary index has been called.
        throw Util.createError('smartUpdate() cannot be used without call ensurePrimary() first.');
    }
    //Construct the key object for the payload.
    var primaryIndexObject = dyModel[Util.PRIMARY_INDEX_PLACEHOLDER];
    //Add the name of the primaryHash value to the Keyobject and put the value passed in.
    payload.Key[primaryIndexObject[CONSTANTS.INDEX_PRIMARY_HASH]] = newObject[primaryIndexObject[CONSTANTS.INDEX_PRIMARY_HASH]];
    payload.Key[primaryIndexObject[CONSTANTS.INDEX_PRIMARY_RANGE]] = newObject[primaryIndexObject[CONSTANTS.INDEX_PRIMARY_RANGE]];
}
/**
Add a name attribute expression to the payload.
**/
SmartUpdateHelper.addExpressionAttributesName = function addExpressionAttributesName(payload, key, nameAlias) {
    if (!payload.hasOwnProperty(KEY_EXPRESSION_ATTRIBUTE_NAMES)) {
        payload[KEY_EXPRESSION_ATTRIBUTE_NAMES] = {};
    }
    payload[KEY_EXPRESSION_ATTRIBUTE_NAMES][nameAlias] = key;
}
/**
Add a value attribute to the payload.
**/
SmartUpdateHelper.addExpressionAttributesValue = function addExpressionAttributesValue(payload, value, valueAlias) {
    if (!payload.hasOwnProperty(KEY_EXPRESSION_ATTRIBUTE_VALUES)) {
        payload[KEY_EXPRESSION_ATTRIBUTE_VALUES] = {};
    }

    //Set the value of the attribute.
    payload[KEY_EXPRESSION_ATTRIBUTE_VALUES][valueAlias] = value;

}

/**
Adds the newObject Value and key to the expressionAttribute fields for the payload.
The expression Name and value are the key value with a '#' as a prefix for name
and a ':' as a prefix for value. This is a standard for DynamoDB.
@param payload (Object): The update object that the expression attributes are added to.
@param newObject (Object): The DynamoDB object that we will update.
@param key (string): Key value for the value that will be updated.
@param nameAlias (String): The alias for the name of the attribute.
@param valueAlias (String): The alias for the value attribute
**/
SmartUpdateHelper.addExpressionAttributes = function addExpressionAttributes(payload, newObject, key, nameAlias, valueAlias) {
    this.addExpressionAttributesName(payload, key, nameAlias);
    this.addExpressionAttributesValue(payload, newObject[key], valueAlias);
}



module.exports = SmartUpdateHelper;

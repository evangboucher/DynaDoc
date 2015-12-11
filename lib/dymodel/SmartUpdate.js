"use strict";
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


Creates a smart Update object which can be constructed and sent off
to update an item in a table.

@author: Evan Boucher
@copyright: Mohu Inc.
**/



var path = require('path');
var Q = require('q');

const LIB_FOLDER = __dirname + "/../";
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));
var CONSTANTS = require(path.join(LIB_FOLDER, "constants"));

var SmartUpdateHelper = require(path.join(__dirname, "./smartUpdateHelper"));

const KEY_UPDATE_EXPRESSION = "UpdateExpression";
const KEY_EXPRESSION_ATTRIBUTE_VALUES = "ExpressionAttributeValues";
const KEY_EXPRESSION_ATTRIBUTE_NAMES = "ExpressionAttributeNames";

/**
REMOVE and SET are actions specifically for updateExpression.
**/
const KEY_ACTION_REMOVE = "REMOVE";
const KEY_ACTION_SET = "SET";
const KEY_ACTION_DELETE = "DELETE";
const KEY_ACTION_ADD = "ADD";

const OPTIONS_DELETE_KEYS = "DeleteKeys";
const OPTIONS_ADD_TO_ARRAYS = "AddToArrays";
const OPTIONS_ADD_MISSING_KEYS = "AddMissingKeys";

/**
Constructor for the DynamoDoc update object.
**/
var SmartUpdate = function SmartUpdate(dynamoDoc, dyModel, newObject, options) {
    this.newObject = newObject;
    this.options = options;
    this.dynamoDoc = dynamoDoc;
    this.dyModel = dyModel;
    //Create the base payload.
    this.payload = {
      "TableName": dyModel.TableName
    };
    //The strings that will be added to the update expression later.
    this.setString = null;
    this.addString = null;
    this.removeString = null;
    this.deleteString = null;
    //Setup the payload with static data.
    SmartUpdateHelper.generateKeyField(this.payload, this.dyModel, this.newObject);
    //Add the options.
    if (options) {
      Util.addOptionsToPayload(this.payload, options);
    }
    this.lockPayload = false;

  }
  /**
  Returns if this payload has been compiled and locked yet.
  **/
SmartUpdate.prototype.isLocked = function isLocked() {
  return this.lockPayload;
}

/**
Finishes the payload and finalizes it.
Once this is called, you can only call send().
**/
SmartUpdate.prototype.compilePayload = function compilePayload() {
    if (this.isLocked()) {
      //No need to throw an error we just won't compile it again.
      return this;
    }
    this.payload[KEY_UPDATE_EXPRESSION] = "";

    if (this.removeString) {
      //Remove is always first since it is index base. Items are removed and then added.
      this.payload[KEY_UPDATE_EXPRESSION] += KEY_ACTION_REMOVE + " " + this.removeString;
    }

    if (this.deleteString) {
      this.payload[KEY_UPDATE_EXPRESSION] += " " + KEY_ACTION_DELETE + " " + this.deleteString;
    }
    console.log('THe setString is: ' + this.setString);
    if (this.setString) {

      this.payload[KEY_UPDATE_EXPRESSION] += " " + KEY_ACTION_SET + " " + this.setString;
    }

    if (this.addString) {
      this.payload[KEY_UPDATE_EXPRESSION] += " " + KEY_ACTION_ADD + " " + this.addString;
    }


    this.lockPayload = true;
    return this;

  }
  /**
  Compile and send off the payload.
  **/
SmartUpdate.prototype.send = function send() {
  var d = Q.defer();
  //@TODO Construct the final payload.
  this.compilePayload();
  this.dynamoDoc.update(this.payload, function(err, res) {
    if (err) {
      d.reject(err);
      throw err;
    }
    d.resolve(res);
  });

  return d.promise;
}

/**
Need a funciton to automatically parse the new object and do a general update.

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
SmartUpdate.prototype.parse = function parse(options) {
  if (this.isLocked()) {
    throw Util.createError('SmartUpdate: parse(): The payload is locked and compiled! No further changes permitted.');
  }
  for (key in newObject) {
    //Skip primary keys, we do not want to update them.
    if (isPrimaryKey(key, dyModel)) {
      continue;
    }
    //The current action we will take.
    var action = null;
    //Check if the key exists in our schema.
    if (dyModel[key]) {
      //The key exists in the schema.
      if (options[OPTIONS_DELETE_KEYS]) {
        //We need to delete every key we find in the object.
        //addUpdateKey(updateObject, key, newObject[key], KEY_ACTION_DELETE);
        //action = KEY_ACTION_REMOVE;
        //continue;
        this.deleteKey(key);
      }
      //If the item is a list type (must be in the schema)
      if (Util.isDynamoListType(dyModel[key].type)) {

        //Check if the user wants to add to arrays or replace them.
        if (options[OPTIONS_ADD_TO_ARRAYS]) {
          //The given key is indeed an array.
          //addUpdateKey(updateObject, key, newObject[key], KEY_ACTION_ADD);
          this.add(key);
        } else {
          //addUpdateKey(updateObject, key, newObject[key], action);
          this.set(key);
        }
        continue;
      }

      //For everything else we will simply set it.
      this.set(key);
      //else key is not in the Table Schema.
    } else {
      //The key does not exist in the schema.
      if (options[OPTIONS_ADD_MISSING_KEYS]) {
        //The user wants us to add missing keys.
        //addUpdateKey(updateObject, key, newObject[key], KEY_ACTION_ADD);
        this.add(key);
        continue;
      }
    }
  }
  return this;
}

/**
Given a key, add that key to the update payload.
Add is best used for numeric input and DynamoDB sets.
Calling this on a number will add the old value to the new value.

@param key (string): The name of the key that you want to use the ADD
    action on for the update.
@param options (Object):
**/
SmartUpdate.prototype.add = function add(key, options) {
  if (this.isLocked()) {
    throw Util.createError('SmartUpdate: add(): The payload is locked and compiled! No further changes permitted.');
  }
  //Add all fields of the newObject to the update call.
  if (!this.newObject[key]) {
    throw Util.createError('SmartUpdate: add(): Key does not exist in update Object.');
  }
  var expressionName = '#' + key;
  var expressionValue = ':' + key;
  //We know the key is inside the new object.
  SmartUpdateHelper.addExpressionAttributes(this.payload, this.newObject, key, expressionName, expressionValue);

  //Now add to the updateString.
  if (this.addString) {
    //Something already exists, so lets append this call to it.
    this.addString += ", " + expressionName + " " + expressionValue;
  } else {
    //It does not exist so lets initalize it.
    this.addString = "" + expressionName + " " + expressionValue;
  }
  return this;
}

function addToSetString(that, expressionName, expressionValue) {
    //Now add to the updateString.
    if (that.setString) {
      //Something already exists, so lets append this call to it.
      that.setString += ", " + expressionName + " = " + expressionValue;
    } else {
        console.log('SetString was not defined. addToSetString()');
      //It does not exist so lets initalize it.
      that.setString = "" + expressionName + " = " + expressionValue;
    }
}
const OPERAND_LIST_APPEND = "list_append";
/**
Creates a list_append and returns it given the first and second arguments.
**/
function constructListAppend(firstArg, secondArg) {
    return OPERAND_LIST_APPEND + "(" + firstArg + ", " + secondArg + ")";
}
/**
Add the listAppend to the setString.
**/
function addListAppendToSetString(that, expressionName, firstArg, secondArg) {
    console.log('addListAppendToSetString()::: List append is: ' + firstArg + ' secondArg: ' + secondArg);
    if (that.setString) {
        console.log('Adding more to setString with listAppend.');
      //Something already exists, so lets append this call to it.
      that.setString += ", " + expressionName + " = " + constructListAppend(firstArg, secondArg);
    } else {
        console.log('SetString was not defined. Initializing it in ListAppendToSetString');
      //It does not exist so lets initalize it.
      that.setString = "" + expressionName + " = " + constructListAppend(firstArg, secondArg);
      console.log('setString is: ' + that.setString);
    }
}

const OPTIONS_SET_APPEND_TO_FRONT = "AppendToFront";
const OPTIONS_SET_INDEX = "Index";
const OPTIONS_SET_IF_NOT_EXIST = "IfNotExist";

SmartUpdate.prototype.setList = function setList(key, options) {
    //If the user sets index, we will use the keyvalue in it and move on.
    /*
    if (index) {
        //The user set an index for us to use.
        addToSetString(this, expressionName + "[" + index + "]", expressionValue);
        return this;
    }
    */
    var nameAlias = "#";
    var valueAlias = ":";

    //Check for an array.
    if (Array.isArray(this.newObject[key])) {
        //keyIsArray = true;
        var appendToFront = false;
        console.log('The key was an array! length: ' + this.newObject[key].length);
        //add each item.
        for(var i = 0; i < this.newObject[key].length; i++) {
            var tempValueAlias = valueAlias + key + i;
            var tempNameAlias = nameAlias + key + i
            console.log('set(): In forloop of array. i = ' + i + ' the value is: ' + JSON.stringify(this.newObject[key][i]));
            //Append to the end of the list.
            if (appendToFront) {
                //Append to front.
                addListAppendToSetString(this, tempNameAlias, tempValueAlias, tempNameAlias);
            } else {
                addListAppendToSetString(this, tempNameAlias, tempNameAlias, tempValueAlias);
            }

            //Add an expression name to the ExpressionAttributeNames field.
            SmartUpdateHelper.addExpressionAttributesName(this.payload, key, tempNameAlias);
            //list_append accepts a list itself as the value. regaurdless of the object, we have to put it as a list in [];
            SmartUpdateHelper.addExpressionAttributesValue(this.payload, [this.newObject[key][i]], tempValueAlias);
        }
        console.log('The current set string after adding array: ' + this.setString);
        return this;

    }
}
/**
Use the set action on the provided key. Set only works only on
root attribute. Passing in a key that represents anything other than a root
attribute will not work and will cause errors.

Note: For lists, there is no way to overwrite the entire list with one call
using the update function. Your best option is to

Lists require additional information within options.
@param options (Object): Options for the set action of DynamoDB.
   - AppendToFront: true | false   [Defaul: false] : Append the given value
    to the front of a list.
   - Index: (Integer) : If the key points to an array/list type, then this
       sets this index to the key value.
   - IfNotExist: true | false [false] : If the element already exists, then
       do nothing. Otherwise, set it to the value.

@TODO Need to check for arrays and use the list_append() function.
@TODO Handle the Index option.
@TODO Handle AppendToFrontOption IE. Flip paramerters for list_append()
**/
SmartUpdate.prototype.set = function set(key, options) {
  if (this.isLocked()) {
    throw Util.createError('SmartUpdate: set(): The payload is locked and compiled! No further changes permitted.');
  }
  //Add all fields of the newObject to the update call.
  if (!this.newObject[key]) {
    throw Util.createError('SmartUpdate: Set(): Key does not exist in update Object.');
  }
  //Check for an array.
  if (Array.isArray(this.newObject[key])) {
      this.setList(key, options);
  }
  //Determine if the key is an array, then we need to append items to it.
  var keyIsArray = false;
  var index;
  var appendToFront = false;
  var setIfNotExist = false;

  //Check for options.
  if (options) {
    if (options[OPTIONS_SET_APPEND_TO_FRONT]) {
        appendToFront = true;
    }
    if (options[OPTIONS_SET_IF_NOT_EXIST]) {
        setIfNotExist = true;
    }
    if (options[OPTIONS_SET_INDEX]) {
        index = options[OPTIONS_SET_INDEX];
    }
  }
  console.log('The key we are working with in set(): ' + key);


  var expressionName = '#' + key;
  var expressionValue = ':' + key;
  //We know the key is inside the new object.
  SmartUpdateHelper.addExpressionAttributes(this.payload, this.newObject, key, expressionName, expressionValue);


  addToSetString(this, expressionName, expressionValue);
  return this;
}

const OPTIONS_LOWER_BOUNDS = "LowerBounds";
const OPTIONS_UPPER_BOUNDS = "UpperBounds";
/**
Remove a nested item from an array or object.

@param options (Object): Options to be used for the remove call.
   - LowerBounds (Integer): If the key is an array, you can specify what element to remove.
       This is the lower bounds (inclusive). Specify only this to delete one item.
   - UpperBounds (Integer): If the item is an array, you can speficy the upper bounds. All
       elements within the lower and upper bounds will be removed.
**/
SmartUpdate.prototype.remove = function remove(key, options) {
  if (this.isLocked()) {
    throw Util.createError('SmartUpdate: remove(): The payload is locked and compiled! No further changes permitted.');
  }
  //Remove a nested key from an object.
  if (!this.newObject[key]) {
    throw Util.createError('SmartUpdate: remove(): Key does not exist in update Object.');
  }
  var lowerBounds;
  var UpperBounds;
  //Empty suffic unless something special happens.
  var suffix = "";
  if (options) {
    if (options[OPTIONS_LOWER_BOUNDS]) {
      lowerBounds = options[OPTIONS_LOWER_BOUNDS];
      if (options[OPTIONS_UPPER_BOUNDS]) {
        if (options[OPTIONS_UPPER_BOUNDS] < options[OPTIONS_LOWER_BOUNDS]) {
          throw Util.createError('smartUpdate: remove(): Upper bounds is greater than lower bounds!');
        }
        for (var i = options[OPTIONS_LOWER_BOUNDS]; i <= options[OPTIONS_UPPER_BOUNDS]; i++) {
          this.remove(key, {
            "LowerBounds": i
          });
        }
      } else {
        //No upper bounds set so we are removing one item.
        suffix = "[" + options[OPTIONS_LOWER_BOUNDS] + "]";
      }
    }
  }
  var expressionName = key + suffix;
  //We know the key is inside the new object.
  //SmartUpdateHelper.addExpressionAttributes(this.payload, this.newObject, nestKeyString, expressionName, expressionValue);

  //Now add to the updateString.
  if (this.removeString) {
    //Something already exists, so lets append this call to it.
    this.removeString += ", " + expressionName;
  } else {
    //It does not exist so lets initalize it.
    this.removeString = "" + expressionName;
  }
  return this;

}

/**
Delete a key from an item.
**/
SmartUpdate.prototype.deleteKey = function deleteKey(key, options) {
    if (this.isLocked()) {
      throw Util.createError('SmartUpdate: deleteKey(): The payload is locked and compiled! No further changes permitted.');
    }
    //Remove a key from the object.
    if (!this.newObject[key]) {
      throw Util.createError('SmartUpdate: deleteKey(): Key does not exist in update Object.');
    }
    var expressionName = '#' + key;
    var expressionValue = ':' + key;
    //We know the key is inside the new object.
    SmartUpdateHelper.addExpressionAttributes(this.payload, this.newObject, key, expressionName, expressionValue);

    //Now add to the updateString.
    if (this.deleteString) {
      //Something already exists, so lets append this call to it.
      this.deleteString += ", " + expressionName + " " + expressionValue;
    } else {
      //It does not exist so lets initalize it.
      this.deleteString = "" + expressionName + " " + expressionValue;
    }

    return this;
  }
  /**
  Returns the smart Payload object.
  **/
SmartUpdate.prototype.getPayload = function getPayload() {
  return this.payload;
}

module.exports = SmartUpdate;

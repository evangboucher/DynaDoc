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

const OPTIONS_SET_APPEND_TO_FRONT = "AppendToFront";
const OPTIONS_SET_INDEX = "Index";
const OPTIONS_SET_IF_NOT_EXIST = "IfNotExist";

const OPTIONS_REMOVE_LOWER_BOUNDS = "LowerBounds";
const OPTIONS_REMOVE_UPPER_BOUNDS = "UpperBounds";

const OPERAND_LIST_APPEND = "list_append";
const OPERAND_IF_NOT_EXIST = "if_not_exists";

/**
Constructor for the DynamoDoc update object.
@param options (Object): Options for a smartUpdate.
   -IgnoreMissing: If true, ignores if an action is taken on a key and the
       key is not present. Default: false
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
      addGlobalOptions(this, options);
    }
    this.lockPayload = false;

  }
  /**
  adds the options to this object.
  **/
function addGlobalOptions(that, options) {
  that.options = {};
  if (options.IgnoreMissing === true) {
    that.options.IgnoreMissing = true;
  }
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
Returns true if the given key is a primary key in the dyModel.
**/
function isPrimaryKey(key, dyModel) {
  if (key === Util.getPrimaryIndexFromModel(dyModel)[CONSTANTS.INDEX_PRIMARY_HASH]) {
    return true;
  } else if (key === Util.getPrimaryIndexFromModel(dyModel)[CONSTANTS.INDEX_PRIMARY_RANGE]) {
    return true;
  }
  return false;
}

/**
@TODO Not Yet Implemented! An idea for auto parsing a newObject and creating
an update feature.
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
**
SmartUpdate.prototype.parse = function parse(options) {
  if (this.isLocked()) {
    throw Util.createError('SmartUpdate: parse(): The payload is locked and compiled! No further changes permitted.');
  }
  for (key in newObject) {
    //Skip primary keys, we do not want to update them.
    if (isPrimaryKey(key, this.dyModel)) {
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
          this.setList(key);
        } else {
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
*/

/**
Given a key, add that key to the update payload.
Add is best used for numeric input and DynamoDB sets.
Calling this on a number will add the old value to the new value.

@param key (string): The name of the key that you want to use the ADD
    action on for the update.
@param options (Object): Options for a smartUpdate.
       -IgnoreMissing: If true, ignores if an action is taken on a key and the
           key is not present. Default: false
**/
SmartUpdate.prototype.add = function add(key, options) {
  var tag = "add()";
  //Throws errors if the params are not valid.
  validate(this, key, tag, options);

  //Check if the key exists.
  if (!this.newObject.hasOwnProperty(key)) {
    if (this.options.IgnoreMissing === true || options.IgnoreMissing === true) {
      //We cannot do anything as we don't know what the value should be.
      return this;
    } else {
      throw Util.createError('SmartUpdate: ' + tag + ' Key does not exist in update Object.');
    }
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
    //It does not exist so lets initalize it.
    that.setString = "" + expressionName + " = " + expressionValue;
  }
}

/**
Creates a list_append and returns it given the first and second arguments.
**/
function constructListAppend(firstArg, secondArg) {
  return OPERAND_LIST_APPEND + "(" + firstArg + ", " + secondArg + ")";
}
/**
Constructs a string that looks like: if_not_exist(<attributeName>, <attributeValue>)
**/
function constructIfNotExist(attributeName, attributeValue) {
  return OPERAND_IF_NOT_EXIST + "(" + attributeName + ", " + attributeValue + ") ";
}
/**
Validate input for update params.
**/
function validate(that, key, tag, options) {
  //So users do not have to pass in options, we can create an empty object if they didnt provide one
  if (!options) {
    options = {};
  }
  //
  if (that.isLocked()) {
    throw Util.createError('SmartUpdate: ' + tag + ' The payload is locked and compiled! No further changes permitted.');
  }


  if (isPrimaryKey(key, that.dyModel)) {
    throw Util.createErorr('SmartUpdate: ' + tag + ' You cannot change the primary key!');
  }
}

/**
Adds a ifNoteExist function to the set String.
@param that (Object): The SmartUpdate builder object.
@param attributeName (String): The attribute name or alias.
@param attributeValue (String); The attribute value or alias.
**/
function setIfNotExist(that, attributeName, attributeValue) {
  addToSetList(that, attributeName, constructIfNotExist(attributeName, attributeValue));
}
/**
Add the listAppend to the setString.
**/
function addListAppendToSetString(that, expressionName, firstArg, secondArg) {
  addToSetList(that, expressionName, constructListAppend(firstArg, secondArg));
}

function addToSetList(that, nameAlias, valueAlias) {
  if (that.setString) {
    //Something already exists, so lets append this call to it.
    that.setString += ", " + nameAlias + " = " + valueAlias;
  } else {
    //It does not exist so lets initalize it.
    that.setString = nameAlias + " = " + valueAlias;
  }
}



/**
Update builder method for updating a List (Array) type.

@param key (string): The name of the key for the newObject that the builder was initailzed with.
@param options (Object): A key value object with potential options listed below:
    -IgnoreMissing: If true, ignores if an action is taken on a key and the
       key is not present. Default: false
    - AppendToFront: true | false   [Defaul: false] : Append the given value
     to the front of a list.
    - Index (integer): The index that the value in the array will replace.
    - setIfNotExist (Boolean): True to use if_not_exists() method. Overrides
       AppendToFront Option. If it already exists, no change is made to the database.


**/
SmartUpdate.prototype.setList = function setList(key, options) {
    var tag = "setList()";
    //Throws errors if the params are not valid.
    validate(this, key, tag, options);
    //Check if the key exists.
    if (!this.newObject.hasOwnProperty(key)) {
      if (this.options.IgnoreMissing === true || options.IgnoreMissing === true) {
        //We cannot do anything as we don't know what the value should be.
        return this;
      } else {
        throw Util.createError('SmartUpdate: ' + tag + ' Key does not exist in update Object.');
      }
    }
    var nameAlias = "#";
    var valueAlias = ":";
    var appendToFront;
    var ifNotExist;
    //Check the options.
    if (options) {
      if (options[OPTIONS_SET_APPEND_TO_FRONT]) {
        appendToFront = options[OPTIONS_SET_APPEND_TO_FRONT];
      }
      if (options[OPTIONS_SET_IF_NOT_EXIST]) {
        ifNotExist = options[OPTIONS_SET_IF_NOT_EXIST];
      }
    }

    //Check for an array.
    if (Array.isArray(this.newObject[key])) {
      //keyIsArray = true;
      var tempValueAlias = valueAlias + key;
      var tempNameAlias = nameAlias + key;
      if (ifNotExist) {
        //The user requested that we set if it does not exist.
        setIfNotExist(this, tempNameAlias, tempValueAlias);
      } else if (appendToFront) {
        //Append to the end of the list.
        //Append to front.
        addListAppendToSetString(this, tempNameAlias, tempValueAlias, tempNameAlias);
      } else {
        addListAppendToSetString(this, tempNameAlias, tempNameAlias, tempValueAlias);
      }
      //Add an expression name to the ExpressionAttributeNames field.
      SmartUpdateHelper.addExpressionAttributesName(this.payload, key, tempNameAlias);
      //list_append accepts a list itself as the value. regaurdless of the object, we have to put it as a list in [];
      SmartUpdateHelper.addExpressionAttributesValue(this.payload, this.newObject[key], tempValueAlias);
      return this;

    } else {
      throw Util.createError('setList(): Update item is not an array type, but is using the setList() function. Use set() instead.');
    }
  }
  /**
  Use the set action on the provided key. Set only works only on
  root attribute. Passing in a key that represents anything other than a root
  attribute will not work and will cause errors.

  Note: For lists, there is no way to overwrite the entire list with one call
  using the update function. Your best option is to

  @param options (Object): Options for the set action of DynamoDB.
     - Index: (Integer) : If the key points to an array/list type, then this
         sets this index to the key value.
     - IfNotExist: true | false [false] : If the element already exists, then
         do nothing. Otherwise, set it to the value. You must use this to add a
         new array to the object.
     - AppendToFront: true | false   [Defaul: false] : Append the given value
         to the front of a list.
     -IgnoreMissing: If true, ignores if an action is taken on a key and the
           key is not present. Default: false

  @TODO Handle the Index option.
  **/
SmartUpdate.prototype.set = function set(key, options) {
  var tag = "set()";
  //Throws errors if the params are not valid.
  validate(this, key, tag, options);
  //If they want to ignore missing keys in the object, then pass this option.

  //Check if the key exists.
  if (!this.newObject.hasOwnProperty(key)) {
    if (this.options.IgnoreMissing === true || options.IgnoreMissing === true) {
      //We cannot do anything as we don't know what the value should be.
      return this;
    } else {
      throw Util.createError('SmartUpdate: ' + tag + ' Key does not exist in update Object.');
    }
  }
  //Check for an array.
  if (Array.isArray(this.newObject[key])) {
    this.setList(key, options);
    return this;
  }
  //Determine if the key is an array, then we need to append items to it.
  var keyIsArray = false;
  var index;
  var appendToFront = false;
  var setIfNotExist = false;

  //Check for options.
  if (options) {

    /* Removed for now. @TODO implement in the future.
    if (options[OPTIONS_SET_IF_NOT_EXIST]) {
        setIfNotExist = true;
    }

    if (options[OPTIONS_SET_INDEX]) {
        index = options[OPTIONS_SET_INDEX];
    }
    */
  }

  var expressionName = '#' + key;
  var expressionValue = ':' + key;
  //We know the key is inside the new object.
  SmartUpdateHelper.addExpressionAttributes(this.payload, this.newObject, key, expressionName, expressionValue);


  addToSetString(this, expressionName, expressionValue);
  return this;
}


/**
Remove items from a root Array/List.
If you are using a DynamoDB set object, you must use Delete to remove Items
from the set.

@param options (Object): Options to be used for the remove call.
   - LowerBounds (Integer): If the key is an array, you can specify what element to remove.
       This is the lower bounds (inclusive). Specify only this to delete one item.
   - UpperBounds (Integer): If the item is an array, you can speficy the upper bounds. All
       elements within the lower and upper bounds will be removed.
   -IgnoreMissing: If true, ignores if an action is taken on a key and the
              key is not present. Default: false
**/
SmartUpdate.prototype.remove = function remove(key, options) {
  var tag = "remove()";
  //Throws errors if the params are not valid.
  validate(this, key, tag, options);
  //Check if the key exists.
  if (!this.newObject.hasOwnProperty(key)) {
    if (this.options.IgnoreMissing === true || options.IgnoreMissing === true) {
      //We cannot do anything as we don't know what the value should be.
      return this;
    } else {
      throw Util.createError('SmartUpdate: ' + tag + ' Key does not exist in update Object.');
    }
  }
  var lowerBounds;
  var UpperBounds;
  //Empty suffic unless something special happens.
  var suffix = "";
  if (options) {
    if (options[OPTIONS_REMOVE_LOWER_BOUNDS]) {
      lowerBounds = options[OPTIONS_REMOVE_LOWER_BOUNDS];
      if (options[OPTIONS_REMOVE_UPPER_BOUNDS]) {
        if (options[OPTIONS_REMOVE_UPPER_BOUNDS] < options[OPTIONS_REMOVE_LOWER_BOUNDS]) {
          throw Util.createError('smartUpdate: remove(): Upper bounds is greater than lower bounds!');
        }
        for (var i = options[OPTIONS_REMOVE_LOWER_BOUNDS]; i <= options[OPTIONS_REMOVE_UPPER_BOUNDS]; i++) {
          this.remove(key, {
            "LowerBounds": i
          });
        }
        //Recursive implementation, so we should stop here.
        return this;
      } else {
        //No upper bounds set so we are removing one item.
        suffix = "[" + options[OPTIONS_REMOVE_LOWER_BOUNDS] + "]";
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
Delete a item from a set or the set itself. This does not work with anything
but DynamoDB sets.

@param options (Object): Options for a smartUpdate.
   -IgnoreMissing: If true, ignores if an action is taken on a key and the
       key is not present. Default: false
**/
SmartUpdate.prototype.deleteKey = function deleteKey(key, options) {
    var tag = "deleteKey()";
    //Throws errors if the params are not valid.
    validate(this, key, tag, options);
    //Check if the key exists.
    if (!this.newObject.hasOwnProperty(key)) {
      if (this.options.IgnoreMissing === true || options.IgnoreMissing === true) {
        //We cannot do anything as we don't know what the value should be.
        return this;
      } else {
        throw Util.createError('SmartUpdate: ' + tag + ' Key does not exist in update Object.');
      }
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

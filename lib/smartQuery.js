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


Functions series for generating a smart payload for the query.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

var path = require('path');
const LIB_FOLDER = __dirname ;
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

var smartQuery = {};


/**
Creates a payload given the data from the user and describeTable method.
Requires that you pass Settings and payload. It does not make any changes to Settings,
but will add query keys to the payload.

@param upperRangeValue: If defined, then the query generated will be a BETWEEN query.

DevNotes: I implemented a way to save queries, but it is not any faster than recreating
the queries again.

The other option to this problem would be to open up some form of this method (at least return
value). This way a developer could create the query once and change the values themselves.
Generating the smart query everytime for the same call is wasteful.
**/
smartQuery.createSmartPayload = function createSmartPayload(payload, settings, indexName, hashValue, rangeValue, action, upperRangeValue) {
    //Get the Indexes object from settings (contains all the indexes).
    var Indexes = Util.getIndexes(settings);
    //Pull out the index object for the index the user wants to use
    var indexObject = Indexes[indexName];
    if (!indexObject) {
        throw Util.createError('IndexName does not exist in Table Description.');
        return;
    }
    if (!action) {
        //No action was defined, so lets always use '='
        action = "=";
    }
    //Check if they gave us a range value, the index may require it. (0  is an acceptable value)
    if (indexObject.Range && (!rangeValue && (rangeValue != 0))) {
        //There is a range object and no rangeValue.
        throw Util.createError('The index: ' + indexName + ' requires a Range Value. Please specify one.');
    }

    //Lets check for already existing smart query
    var smartQuery = Util.getSavedQuery(settings, indexName, action);
    /*
    Performance wise, the two methods are about the same. Infact, in some
    cases, recreating the query every time is faster! (likely the hash algroithm)
    Lets never save a BETWEEN value for right now...
    */
    if (smartQuery && !upperRangeValue) {
        /*
        This means we already have the payload in the smartQuery object.
        This works by the assumption that all of the payload stays the same
        but the values.
        */
        var expressionAttributeValues = smartQuery.ExpressionAttributeValues;
        if (expressionAttributeValues) {
            //All is going well, lets set the values.
            //We may need to set hash and/or range values.
            expressionAttributeValues[Util.PAYLOAD_HASH_VALUE_KEY] = hashValue;
            if (rangeValue) {
                expressionAttributeValues[Util.PAYLOAD_RANGE_VALUE_KEY] = rangeValue;
            }

            payload = smartQuery;
            return smartQuery;
        }
        //If we do not have the expression Attribute saved, we cannot use this payload!
        //Do nothing and lets generate it  again...

    }

    //Initialize our variables.
    var expressionAttributeNames = {};
    var expressionAttributeValues = {};

    var keyConditionExpression = "";
    //We need to check if this is a primary index or secondary.
    if (indexObject.isPrimary) {
        //This is the primary index then you do not specify an IndexName (default is primary!)
    } else {
        payload.IndexName = indexName;
    }

    //Generate the name expression attributes.
    expressionAttributeNames[Util.PAYLOAD_HASH_NAME_KEY] = indexObject.Hash.name;
    expressionAttributeValues[Util.PAYLOAD_HASH_VALUE_KEY] = hashValue;

    //Now generate the keyConditionExpression.
    //Note: Using '+' to concat strings is the faster way in JavaScript.
    keyConditionExpression = Util.PAYLOAD_HASH_NAME_KEY + " = " + Util.PAYLOAD_HASH_VALUE_KEY;

    //If we are also including a range value.
    if (rangeValue) {
        //Check if the range is a Between or standard range.
        if (upperRangeValue) {
            //we need to set it up for a BETWEEN value range. BETWEEN always using "and" as its action.
            keyConditionExpression += " and " + Util.PAYLOAD_RANGE_NAME_KEY + " BETWEEN " + Util.PAYLOAD_RANGE_VALUE_KEY + " and " + Util.PAYLOAD_RANGE_UPPER_VALUE_KEY;

            //Set the upper value.
            expressionAttributeValues[Util.PAYLOAD_RANGE_UPPER_VALUE_KEY] = upperRangeValue;
        } else {
            //The general Range expression with the user action.
            keyConditionExpression += " and " + Util.PAYLOAD_RANGE_NAME_KEY + " " + action + " " + Util.PAYLOAD_RANGE_VALUE_KEY;
        }
        //Change their values.
        expressionAttributeNames[Util.PAYLOAD_RANGE_NAME_KEY] = indexObject.Range.name;
        expressionAttributeValues[Util.PAYLOAD_RANGE_VALUE_KEY] = rangeValue;
    }
    payload.KeyConditionExpression = keyConditionExpression;
    payload.ExpressionAttributeValues = expressionAttributeValues;
    payload.ExpressionAttributeNames = expressionAttributeNames;
    //Lets save the query for use later!
    Util.saveQuery(settings, payload, action);
    return payload;


}


module.exports = smartQuery;

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


var util = {};

//This may be better in a const file.
const PAYLOAD_HASH_NAME_KEY = "#hName";
const PAYLOAD_HASH_VALUE_KEY = ":hValue";
const PAYLOAD_RANGE_NAME_KEY = "#rName";
const PAYLOAD_RANGE_VALUE_KEY = ":rValue";
const PAYLOAD_RANGE_UPPER_NAME_KEY = "#rUValue";
const PAYLOAD_RANGE_UPPER_VALUE_KEY = ":rUValue";

const PRIMARY_INDEX_PLACEHOLDER = "PrimaryIndex";

const ERROR_MESSAGE_PREFIX = "DynaDocValidation: ";

util.PAYLOAD_HASH_NAME_KEY = PAYLOAD_HASH_NAME_KEY;
util.PAYLOAD_HASH_VALUE_KEY = PAYLOAD_HASH_VALUE_KEY;
util.PAYLOAD_RANGE_NAME_KEY = PAYLOAD_RANGE_NAME_KEY;
util.PAYLOAD_RANGE_VALUE_KEY = PAYLOAD_RANGE_VALUE_KEY;
util.PAYLOAD_RANGE_UPPER_NAME_KEY = PAYLOAD_RANGE_UPPER_NAME_KEY;
util.PAYLOAD_RANGE_UPPER_VALUE_KEY = PAYLOAD_RANGE_UPPER_VALUE_KEY;
util.PRIMARY_INDEX_PLACEHOLDER = PRIMARY_INDEX_PLACEHOLDER;


/**
    Get the Indexes object for
**/
util.getIndexes =  function getIndexes(settings) {
    if (!settings.Indexes) {
        settings.Indexes = {};
    }
    return settings.Indexes;
}

/**
    Get the saved smart queiries object in settings.
**/
util.getSavedQueriesObject = function getSavedQueriesObject(settings) {
    if (!settings.savedQueries) {
        settings.savedQueries = {};
    }
    return settings.savedQueries;
}
/**
 Generate a string that will be used as the key (not a real hash)
**/
util.getQueryHash = function getQueryHash(indexName, action) {
    return indexName + action;
}
/**
    Check if a smart query already exists and returns the payload object.
**/
util.getSavedQuery = function getSavedQuery(settings, indexName, action) {

    var queryHash = util.getQueryHash(indexName, action);
    var savedQueries = util.getSavedQueriesObject(settings);
    if (savedQueries[queryHash]) {
        return savedQueries[queryHash];
    }
    //Return undefined if we did not find the hash.
    return undefined;
}
/**
    Save a smart query to be used later so it does not have to be generated.
    Pass in action (easier than parsing the payload for the action.)
**/
util.saveQuery = function saveQuery(settings, payload, action) {
    //We can pull the necessary details from the payload.
    var indexName = payload.IndexName;
    if (!indexName) {
        //the indexName is not defined, this means it is primary.
        indexName = PRIMARY_INDEX_PLACEHOLDER;
    }
    var queryHash = util.getQueryHash(indexName, action);
    var savedQueries = util.getSavedQueriesObject(settings);
    //Save the payload with its hash.
    savedQueries[queryHash] = payload;
}
//Merges two objects together.
util.mergeObject = function mergeObject(first, second) {
    //Merge the second object into the first one.
    for(var key in second) {
        first[key] = second[key];
    }
    return first;
}

module.exports = util;

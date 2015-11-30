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


Functions for index Creation.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

var path = require('path');

var CreateIndexHelper = {};

const KEY_INDEX_GLOBAL = "GlobalSecondaryIndexes";
const KEY_INDEX_LOCAL = "LocalSecondaryIndexes";
const KEY_ATTRIBUTE_DEFINITION = "AttributeDefinitions";
const KEY_INDEX_PRIMARY = "KeySchema";
const KEY_TABLE_NAME = "TableName";
const KEY_PROVISIONED_THROUGHPUT = "ProvisionedThroughput";

//These are used for index creation (indexObject).
const INDEX_CREATION_HASH_KEY = "HashName";
const INDEX_CREATION_RANGE_KEY = "RangeName";

//Attribute types.
const TYPE_KEY_HASH = "HASH";
const TYPE_KEY_RANGE = "RANGE";
//Attribute keys.
const KEY_ATTRIBUTE_NAME = "AttributeName";
const KEY_ATTRIBUTE_TYPE = "AttributeType";

const DEFULT_PROJECTION_TYPE = "KEYS_ONLY";

var CONSTANTS = require(path.join(__dirname, "../constants"));

var path = require('path');
const LIB_FOLDER = __dirname + "/../";
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

CreateIndexHelper.createIndexObject = function createIndexObject(hashName, rangeName) {
    var indexObject = {};
    indexObject[INDEX_CREATION_HASH_KEY] = hashName;
    if (rangeName) {
        indexObject[INDEX_CREATION_RANGE_KEY] = rangeName;
    }
    return indexObject;
}

function getAttributeDefinitions(payload) {
    return payload[KEY_ATTRIBUTE_DEFINITION];
}
/**
Ensures that the attribute definitions key is in the payload.
Adds it if it is not found.
**/
function ensureAttributeDefinitions(payload) {
    if (payload[KEY_ATTRIBUTE_DEFINITION]) {
        //Already defined.
    } else {
        payload[KEY_ATTRIBUTE_DEFINITION] = [];

    }
}
/**
Creates an attribute definition object from the name and type.
**/
function createAttributeObject(name, type) {
    var attributeObject = {};
    attributeObject[KEY_ATTRIBUTE_NAME] = name;
    attributeObject[KEY_ATTRIBUTE_TYPE] = type;
    return attributeObject;
}
//Add attribute object to the attribute Definitions.
function addAttributeDefinitions(attributeDefinition, attributeObject) {
    attributeDefinition.push(attributeObject);
}

/**
Currently DynamoDB does not support nested Indexes! So if it is not
in the root of the model, then it cannot be an index!
**/
function searchModelForKey(key, model) {
    return model[key];
}

/**
Function to create a indexName from the hash and range name.
**/
function createIndexName(hashName, rangeName) {
    if (rangeName) {
        return hashName + "-" + rangeName + "-index";
    }
    return hashName + "-index";
}

/**
Generates the basic keys for an index. These keys are chared across both global
and local indexes (Primary is different as it is single index within the
payload object sent to DynamoDB).
**/
function generateMainIndexKeys(indexPayload, indexObject, readCapacity, writeCapacity, indexName) {
    if (indexName) {
        indexPayload.IndexName = indexName;
    } else {
        indexPayload.IndexName = createIndexName(indexObject[INDEX_CREATION_HASH_KEY], undefined);
    }


    indexPayload.KeySchema = [];
    if (readCapacity && writeCapacity) {
        indexPayload[KEY_PROVISIONED_THROUGHPUT] = {
            "ReadCapacityUnits": readCapacity,
            "WriteCapacityUnits": writeCapacity
        };
    }

    //@TODO Handle Project attributes. For now lets include KEYS_ONLY
    indexPayload.Projection = {
        "ProjectionType": DEFULT_PROJECTION_TYPE
    };

    //Create the key Schema.
    indexPayload.KeySchema.push({
        "AttributeName": indexObject[INDEX_CREATION_HASH_KEY],
        "KeyType": TYPE_KEY_HASH
    });
}

/**
Adds a range index to the payload (if the indexObject has
the necessary range key in it).
@param payload (Object): The main payload for creating the table.
@param indexPayload (Object): The index payload object we are adding to.
@param indexObject (Object): The DyModel index object that describes the index
  we are creating.
@param dyModel (Object): The Joi model that describes this table.
**/
function addRangeKey(payload, indexPayload, indexObject, dyModel) {
    //If there is a range key for this index.
    if (indexObject[INDEX_CREATION_RANGE_KEY]) {
        var rangeModelObject = searchModelForKey(indexObject[INDEX_CREATION_RANGE_KEY], dyModel);
        //There is a range value for this index.
        //Now lets create the key schema object for the Hash.
        indexPayload.KeySchema.push({
            "AttributeName": indexObject[INDEX_CREATION_RANGE_KEY],
            "KeyType": TYPE_KEY_RANGE
        });
        //This adds the hash Index to the attribute definition.
        //Seperated for readability.
        var attributeObject = createAttributeObject(indexObject[INDEX_CREATION_RANGE_KEY], rangeModelObject.type);
        addAttributeDefinitions(getAttributeDefinitions(payload), attributeObject);

    }
}

/**
Sets the primary index for the table. This should only ever be called once!
You absolutely must call this first!
@param payload (Object): The table payload that will be sent (Modified by this method)
@param indexObject (Object): DyModel index object that describes the index.
@param dyModel (Object): The DyModel that describes the table.
@param readCapacity (Integer): Read throughput for DynamoDB index.
@param writeCapacity (Integer): The write throughput for DynamoDB index.

Throws an error if called and a primary index already exists.
**/
CreateIndexHelper.addPrimaryIndex = function addPrimaryIndex(payload, indexObject, dyModel) {
    //Given a payload, we should add the primary schema to it.
    if (payload[KEY_INDEX_PRIMARY]) {
        //The primary index already exists.
        //@TODO maybe this is an error?
        throw new Error('DynaDoc: Attempted to create more than one primary index!');
    } else {
        //Get the typeObject for Hashfrom the dyModel.
        var hashModelObject = searchModelForKey(indexObject[INDEX_CREATION_HASH_KEY], dyModel);

        payload[KEY_INDEX_PRIMARY] = [];
        //Now we need to add AttributeDefinitions.
        ensureAttributeDefinitions(payload);

        //Now lets create the key schema object for the Hash.
        payload[KEY_INDEX_PRIMARY].push({
            "AttributeName": indexObject[INDEX_CREATION_HASH_KEY],
            "KeyType": TYPE_KEY_HASH
        });
        //This adds the hash Index to the attribute definition.
        //Seperated for readability.
        var attributeObject = createAttributeObject(indexObject[INDEX_CREATION_HASH_KEY], hashModelObject.type);
        addAttributeDefinitions(getAttributeDefinitions(payload), attributeObject);

        //Lets add the primary index to the dyModel object.
        dyModel[Util.PRIMARY_INDEX_PLACEHOLDER] = {};
        dyModel[Util.PRIMARY_INDEX_PLACEHOLDER][CONSTANTS.INDEX_PRIMARY_HASH] = indexObject[INDEX_CREATION_HASH_KEY];

        //If there is a range key for this index.
        if (indexObject[INDEX_CREATION_RANGE_KEY]) {
            var rangeModelObject = searchModelForKey(indexObject[INDEX_CREATION_RANGE_KEY], dyModel);
            //There is a range value for this index.
            //Now lets create the key schema object for the Hash.
            payload[KEY_INDEX_PRIMARY].push({
                "AttributeName": indexObject[INDEX_CREATION_RANGE_KEY],
                "KeyType": TYPE_KEY_RANGE
            });
            //This adds the hash Index to the attribute definition.
            //Seperated for readability.
            var attributeObject = createAttributeObject(indexObject[INDEX_CREATION_RANGE_KEY], rangeModelObject.type);
            addAttributeDefinitions(getAttributeDefinitions(payload), attributeObject);

            //Lets add the primary index to the dyModel object.
            dyModel[Util.PRIMARY_INDEX_PLACEHOLDER][CONSTANTS.INDEX_PRIMARY_RANGE] = indexObject[INDEX_CREATION_RANGE_KEY];
        }


    }
}

/**
Adds a Global index to the table payload.
@param payload (Object): The table payload that will be sent (Modified by this method)
@param indexObject (Object): DyModel index object that describes the index.
@param dyModel (Object): The DyModel that describes the table.
@param readCapacity (Integer): Read throughput for DynamoDB index.
@param writeCapacity (Integer): The write throughput for DynamoDB index.
**/
CreateIndexHelper.addGlobalIndex = function addGlobalIndex(payload, indexObject, dyModel, readCapacity, writeCapacity, indexName) {
    if (!payload[KEY_INDEX_GLOBAL]) {
        //Create the global Index object in the payload (if this is the first one).
        payload[KEY_INDEX_GLOBAL] = [];

    }
    var indexPayload = {};
    //Lets add this global index.
    var hashModelObject = searchModelForKey(indexObject[INDEX_CREATION_HASH_KEY], dyModel);
    //This will generate the basic elemtns of the payload.
    generateMainIndexKeys(indexPayload, indexObject, readCapacity, writeCapacity);

    //This adds the hash Index to the attribute definition.
    //Seperated for readability.
    var attributeObject = createAttributeObject(indexObject[INDEX_CREATION_HASH_KEY], hashModelObject.type);
    addAttributeDefinitions(getAttributeDefinitions(payload), attributeObject);

    //If there is a range key for this index.
    if (indexObject[INDEX_CREATION_RANGE_KEY]) {
        addRangeKey(payload, indexPayload, indexObject, dyModel);
        if (indexName) {
            indexPayload.IndexName = indexName;
        } else {
            //Update the indexname with the range value.
            indexPayload.IndexName = createIndexName(indexObject[INDEX_CREATION_HASH_KEY], indexObject[INDEX_CREATION_RANGE_KEY]);
        }
    }


    //Add the index payload to the global index array.
    payload[KEY_INDEX_GLOBAL].push(indexPayload);
}

/**
Adds a local index to the table payload.
@param payload (Object): The table payload that will be sent (Modified by this method)
@param indexObject (Object): DyModel index object that describes the index.
@param dyModel (Object): The DyModel that describes the table.
**/
CreateIndexHelper.addLocalIndex = function addLocalIndex(payload, indexObject, dyModel, indexName) {
    //@TODO Implement the index creation for localIndexes.
    if (!payload[KEY_INDEX_LOCAL]) {
        //Create the global Index object in the payload (if this is the first one).
        payload[KEY_INDEX_LOCAL] = [];

    }
    var indexPayload = {};
    //Lets add this global index.
    var hashModelObject = searchModelForKey(indexObject[INDEX_CREATION_HASH_KEY], dyModel);

    //This will generate the basic elemtns of the payload.
    generateMainIndexKeys(indexPayload, indexObject);

    /*
    Since this is a secondary local index it does not need the hash
    in the attribute definitions since the primary hash should already
    exist.
    */
    //If there is a range key for this index.
    if (indexObject[INDEX_CREATION_RANGE_KEY]) {
        addRangeKey(payload, indexPayload, indexObject, dyModel);
        //Set the new index name
        //Update the indexname with the range value.
        if (indexName) {
            indexPayload.IndexName = indexName;
        } else {
            indexPayload.IndexName = createIndexName(indexObject[INDEX_CREATION_HASH_KEY], indexObject[INDEX_CREATION_RANGE_KEY]);
        }
    }

    //Add the index payload to the global index array.
    payload[KEY_INDEX_LOCAL].push(indexPayload);

}
module.exports = CreateIndexHelper;

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

CreateIndexHelper.createIndexObject = function createIndexObject(hashName, rangeName) {
    var indexObject = {};
    indexObject[INDEX_CREATION_HASH_KEY] = hashName;
    if (rangeName) {
        indexObject[INDEX_CREATION_RANGE_KEY] = rangeName;
    }
    return indexObject;
}

/**
Uses the model to determine types and names of the index (IE. Users connot
create or name their index themselves).

indexNameArray has the following format:
[{
    "hashKey":"<NameOfHashKeyInModel>",
    "rangeKey":"<NameOfRangeKeyInModel>"
}, <Repeat per index>]

**/
CreateIndexHelper.generatePayload = function generatePayload(indexArray, dyModel, readCapacity, writeCapacity) {
    //Given a Joi schema, lets figure out what the index they want is.
    var payload = {};
    /*
    Need to figure out the structure of a Joi Schema object.
    THe Joi object is massive and contains no easy way to access invidual
    keys or elements (would have to parse the whole structure, which
    we may do later or make our own).
    */

    //We can us Joi.isRef() to determine if a the key is valid.
    console.log('CreateIndex generatePayload Entered.');
    console.log(JSON.stringify(dyModel, null, 4));
    console.log(JSON.stringify(indexArray, null, 4));


    console.log('EXIT generatePayload for CreateIndexHelper');

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

CreateIndexHelper.addPrimaryIndex = function addPrimaryIndex(payload, indexObject, dyModel, readCapacity, writeCapacity) {
    //Given a payload, we should add the primary schema to it.
    if (payload[KEY_INDEX_PRIMARY]) {
        //The primary index already exists.
        console.log('The primary index already exists!');
    } else {
        var hashModelObject = searchModelForKey(indexObject[INDEX_CREATION_HASH_KEY], dyModel);
        payload[KEY_INDEX_PRIMARY] = [];
        //Now we need to add AttributeDefinitions.
        ensureAttributeDefinitions(payload);

        //Now lets create the key schema object for the Hash.
        payload[KEY_INDEX_PRIMARY].push({"AttributeName":indexObject[INDEX_CREATION_HASH_KEY],"KeyType": TYPE_KEY_HASH});
        //This adds the hash Index to the attribute definition.
        //Seperated for readability.
        var attributeObject = createAttributeObject(indexObject[INDEX_CREATION_HASH_KEY], hashModelObject.type);
        addAttributeDefinitions(getAttributeDefinitions(payload), attributeObject);
        
        //If there is a range key for this index.
        if (indexObject[INDEX_CREATION_RANGE_KEY]) {
            //There is a range value for this index.
            //Now lets create the key schema object for the Hash.
            payload[KEY_INDEX_PRIMARY].push({"AttributeName":indexObject[INDEX_CREATION_RANGE_KEY],"KeyType": TYPE_KEY_RANGE});
            //This adds the hash Index to the attribute definition.
            //Seperated for readability.
            var attributeObject = createAttributeObject(indexObject[INDEX_CREATION_RANGE_KEY], hashModelObject.type);
            addAttributeDefinitions(getAttributeDefinitions(payload), attributeObject);
        }

    }
}

CreateIndexHelper.addGlobalIndex = function addGlobalIndex(indexObject, dyModel, readCapacity, writeCapacity) {

}

CreateIndexHelper.addLocalIndex = function addLocalIndex(indexObject, dyModel, readCapacity, writeCapacity) {

}
module.exports = CreateIndexHelper;

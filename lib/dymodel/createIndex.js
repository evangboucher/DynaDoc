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

const KEY_INDEX_NAME = "IndexName";

//These are used for index creation (indexObject).
const INDEX_CREATION_HASH_KEY = "HashName";
const INDEX_CREATION_RANGE_KEY = "RangeName";

const INDEX_OPTIONS_KEY = "Options";

//Attribute types.
const TYPE_KEY_HASH = "HASH";
const TYPE_KEY_RANGE = "RANGE";
//Attribute keys.
const KEY_ATTRIBUTE_NAME = "AttributeName";
const KEY_ATTRIBUTE_TYPE = "AttributeType";

const DEFAULT_PROJECTION_TYPE = "KEYS_ONLY";

//Keys used for updating a global index.
const UPDATE_GLOBAL_INDEX_KEY = "GlobalSecondaryIndexUpdates";
const UPDATE_INDEX_UPDATE_KEY = "Update";
const UPDATE_INDEX_CREATE_KEY = "Create";
const UPDATE_INDEX_DELETE_KEY = "Delete";

const DEFAULT_NAME_SEPERATOR = "-";


var path = require('path');
const LIB_FOLDER = __dirname + "/../";
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));
var CONSTANTS = require(path.join(LIB_FOLDER, "constants"));

function generateIndexObject(hashName, rangeName, options, isLocalIndex) {
    var indexObject = {};
    indexObject[INDEX_CREATION_HASH_KEY] = hashName;
    if (rangeName) {
        indexObject[INDEX_CREATION_RANGE_KEY] = rangeName;
    }
    if (options) {
        if (isLocalIndex) {
            //For now, local does not require anything special.
        } else {
            if (!options.hasOwnProperty("ReadCapacityUnits")) {
                console.log('ReadCapacityUnits was not set by the user.');
                options.ReadCapacityUnits = CONSTANTS.DEFAULT_READ_THROUGHPUT;
            }
            if (!options.hasOwnProperty("WriteCapacityUnits")) {
                console.log('Write Capcity units were not set by the user.');
                options.WriteCapacityUnits = CONSTANTS.DEFAULT_WRITE_THROUGHPUT;
            }
        }

        indexObject[INDEX_OPTIONS_KEY] = options;
    }
    console.log(JSON.stringify(indexObject, null, 4));
    return indexObject;
}

CreateIndexHelper.createIndexObjectLocal = function createIndexObjectLocal(hashName, rangeName, options) {
        return generateIndexObject(hashName, rangeName, options, true);
}
/**
    Creates an object that represents an index in DynaDoc.

    @param hashName (String): The name of the hash attribute
    @param rangeName (String): The name of the range attribute.
    @param options (Object): Additional options for this specific index. Options Include:
       - ProjectionType: KEYS_ONLY | INCLUDE | ALL
       - NonKeyAttributes: Array of Strings when Project is INCLUDE.
           Strings are the attribute names to project into the index.
**/
CreateIndexHelper.createIndexObject = function createIndexObject(hashName, rangeName, options) {
    return generateIndexObject(hashName, rangeName, options);
}

/**
Get the attribute definitions object from the payload.
If it does not exist, it will be created.
**/
function getAttributeDefinitions(payload) {
    if (!payload[KEY_ATTRIBUTE_DEFINITION]) {
        payload[KEY_ATTRIBUTE_DEFINITION] = [];
    }
    return payload[KEY_ATTRIBUTE_DEFINITION];
}

/**
Get the Global index Array
create the global index Array in the payload if it does not exist.
**/
function getGlobalIndexArray(payload) {
    if (!payload[KEY_INDEX_GLOBAL]) {
        payload[KEY_INDEX_GLOBAL] = [];
    }
    return payload[KEY_INDEX_GLOBAL];
}

/**
Get the local index array for create table.
Creates the array in the payload if it does not exist.
**/
function getLocalIndexArray(payload) {
    if (!payload[KEY_INDEX_LOCAL]) {
        payload[KEY_INDEX_LOCAL] = [];
    }
    return payload[KEY_INDEX_LOCAL];
}

/**
Get the global index array for updates.
Creates the global update index array if it does not exist.
**/
function getGlobalIndexUpdateArray(payload) {
    if (!payload[UPDATE_GLOBAL_INDEX_KEY]) {
        payload[UPDATE_GLOBAL_INDEX_KEY] = [];
    }
    return payload[UPDATE_GLOBAL_INDEX_KEY];
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
Access the DyModel (simple schema) and return its object (contains the type).
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
@param indexPayload (Object): The specific index object that will be pushed into the index array.
@param indexObject (Object): Object generated by DyModel for the index creation.
@param readCapacity (integer): The set provisioned read units for this index.
@param writeCapacity (integer): The set provisioned write units for this index.
@param indexName (String): The name that DynamoDB will call this index.
@param options (Object): Additional options for this specific index. Options Include:
   - ProjectionType: KEYS_ONLY | INCLUDE | ALL
   - NonKeyAttributes: Array of Strings when Project is INCLUDE.
       Strings are the attribute names to project into the index.
**/
function generateMainIndexKeys(indexPayload, indexObject, indexName) {
    var options = indexObject[INDEX_OPTIONS_KEY];
    if (indexName) {
        indexPayload.IndexName = indexName;
    } else {
        indexPayload.IndexName = createIndexName(indexObject[INDEX_CREATION_HASH_KEY], undefined);
    }


    indexPayload.KeySchema = [];
    //If no read and write capacity is passed, then it is likely a local index.
    if (options.ReadCapacityUnits && options.WriteCapacityUnits) {
        indexPayload[KEY_PROVISIONED_THROUGHPUT] = {
            "ReadCapacityUnits": options.ReadCapacityUnits,
            "WriteCapacityUnits": options.WriteCapacityUnits
        };
    }
    var projectionType = DEFAULT_PROJECTION_TYPE;
    var NonKeyAttributes = null;
    var includeProjectType = true;


    /*
    Can be altered by options.
    There has to be a cleaner way of doing this. Revisit.
    @TODO Clean this up.
    */
    if (options) {
        if (options.ProjectionType === "KEYS_ONLY") {
            projectionType = options.ProjectionType;

        } else if (options.ProjectionType === "ALL") {
            projectionType = options.ProjectionType;
            //Include is a bit more indepth.
        }
        //Include is a special case that requires additional information.
        if (options.ProjectionType === "INCLUDE") {
            if (!options.NonKeyAttributes) {
                throw Util.createError('createIndex(): Invalid Projection. Include requires that NonKeyAttributes list be provided.');
            }
            projectionType = options.ProjectionType;
            //The projection type for the index.
            indexPayload.Projection = {
                "ProjectionType": projectionType,
                "NonKeyAttributes": options.NonKeyAttributes
            };
            //dont include it as we already took care of it.
            includeProjectType = false;
        }
    }
    if (includeProjectType) {
        //The projection type for the index.
        indexPayload.Projection = {
            "ProjectionType": projectionType
        };
    }


    //Create the key Schema.
    indexPayload.KeySchema.push({
        "AttributeName": indexObject[INDEX_CREATION_HASH_KEY],
        "KeyType": TYPE_KEY_HASH
    });
    console.log('The IndexPayload within generateMainIndexKeys...');
    console.log(JSON.stringify(indexPayload, null, 4));
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
        throw Util.createError('Attempted to create more than one primary index!');
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
Global indexes are currently the only indexes that are able to be updated or
created after the table has been created.

@param payload (Object): The table payload that will be sent (Modified by this method)
@param indexObject (Object): DyModel index object that describes the index.
@param dyModel (Object): The DyModel that describes the table.
@param readCapacity (Integer): Read throughput for DynamoDB index.
@param writeCapacity (Integer): The write throughput for DynamoDB index.
@param updateIndex (Boolean): True if you want to add the index as an UpdateTable
   query. This only creates the index. This will not delete or update it.
**/
CreateIndexHelper.addGlobalIndex = function addGlobalIndex(payload, indexObject, dyModel, indexName, updateIndex) {
    var indexPayload = {};
    //Lets add this global index.
    var hashModelObject = searchModelForKey(indexObject[INDEX_CREATION_HASH_KEY], dyModel);
    //This will generate the basic elemtns of the payload.
    generateMainIndexKeys(indexPayload, indexObject, indexName);

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
    //If the user wants to create a index via the UpdateTable request.
    if (updateIndex) {
        //We need to add a root object to the payload with key "Create"
        var createIndexUpdate = {};
        //Adds a root object of "Create" for the update.
        createIndexUpdate[UPDATE_INDEX_CREATE_KEY] = indexPayload;
        //Add the index payload to the global index array.
        getGlobalIndexUpdateArray(payload).push(createIndexUpdate);
        return;
    }

    //Add the index payload to the global index array.
    getGlobalIndexArray(payload).push(indexPayload);
}

/**
Adds a local index to the table payload.
A local index cannot be added if the table's primary index does not have
a Range. IE. You must first use the Primary Index range value, before
you can add a local index.
@param payload (Object): The table payload that will be sent (Modified by this method)
@param indexObject (Object): DyModel index object that describes the index.
@param dyModel (Object): The DyModel that describes the table.
**/
CreateIndexHelper.addLocalIndex = function addLocalIndex(payload, indexObject, dyModel, indexName) {
    var localIndexArray = getLocalIndexArray(payload);
    var indexPayload = {};
    //Lets add this global index.
    var hashModelObject = searchModelForKey(indexObject[INDEX_CREATION_HASH_KEY], dyModel);

    /*
    This will generate the basic elements of the payload.
    Pass nothin in for the read and write params. Local Index do not have them
    but we need to set the indexName if it was passed in.
    */
    generateMainIndexKeys(indexPayload, indexObject, indexName);

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
    localIndexArray.push(indexPayload);

}

/**
Updates a global index read and write capacity.
Adds the item to the payload.
@param payload (object): The tablePayload object that will be sent to DynamoDB
@param indexName (String): The name of the index we are updating.
@param readCapacity (integer): Integer between the min (1) and max throughput for read capacity
@param writeCapacity (integer): Integer between the min (1) and max throughput for write capacity.
**/
CreateIndexHelper.updateGlobalIndex = function updateGlobalIndex(payload, indexName, readCapacity, writeCapacity) {
    var updatePayload = {};
    updatePayload[UPDATE_INDEX_UPDATE_KEY] = {
        "IndexName": indexName
    };

    //Merge the provisioned throughput item into the updatePayload.
    Util.mergeObject(updatePayload[UPDATE_INDEX_UPDATE_KEY], Util.createThroughputItem(readCapacity, writeCapacity));
    //Push the update payload to the gloal index object inside the payload item.
    getGlobalIndexUpdateArray(payload).push(updatePayload);

}

/**
Creates a Delete item for the Index Update. Deletes the indexName passed
in. This can delete both global and local indexes. Local indexes cannot
be recreated after they have been deleted.
@param IndexName (String): The string name of the Global Index.
**/
CreateIndexHelper.deleteIndex = function deleteGlobalIndex(payload, indexName) {
    //Empty object to construct the delete object.
    var deleteIndexPayload = {};
    //Create the root delete key for dynamoDB.
    deleteIndexPayload[UPDATE_INDEX_DELETE_KEY] = {};
    //Put the indexName key into the delete key and add the indexName passed in.
    deleteIndexPayload[UPDATE_INDEX_DELETE_KEY][KEY_INDEX_NAME] = indexName;
    //Push it to the update array for Global Indexes.
    getGlobalIndexUpdateArray(payload).push(deleteIndexPayload);
}

/**
Simple funciton to generate a index name if the user does not supply one.
**/
function generateIndexName(prefix, hashName, rangeName) {
    //There must be at least a hashValue.
    if (arguments.length < 2) {
        throw Util.createError('GenerateIndexName must have a hashValue.');
    }
    var name = "" + prefix + DEFAULT_NAME_SEPERATOR + hashName;

    if (rangeName) {
        name += DEFAULT_NAME_SEPERATOR + rangeName;
    }
    name += DEFAULT_NAME_SEPERATOR + "index";
    return name;
}

/**
Returns the indexName the names exists, otherwise generates it.
**/
CreateIndexHelper.getIndexName = function hasIndexName(options, prefix, hashName, rangeName) {
    if (options.hasOwnProperty(KEY_INDEX_NAME)) {
        return options[KEY_INDEX_NAME];
    }
    return generateIndexName(prefix, hashName, rangeName);
}
module.exports = CreateIndexHelper;

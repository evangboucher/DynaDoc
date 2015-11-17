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


Functions for parsing a table description and storing its values.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

var path = require('path');
const LIB_FOLDER = __dirname ;
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

//The helper object that this file will create.
var DescribeTableHelper = {};


/**
Parses out the primary Key Schema for the Table.
Adds the indexes to the Indexes section of the DynaDoc settings.
**/
DescribeTableHelper.parsePrimaryKeySchema = function parsePrimaryKeySchema(settings, primaryKeySchema) {
    var Indexes = Util.getIndexes(settings);
    Indexes[Util.PRIMARY_INDEX_PLACEHOLDER] = {
        "Hash": {
            "name": primaryKeySchema[0].AttributeName
        },
        "isPrimary": true
    };
    //Now we need to see if there is a range key.
    if (primaryKeySchema.length === 2) {

        Indexes[Util.PRIMARY_INDEX_PLACEHOLDER].Range = {
            "name": primaryKeySchema[1].AttributeName
        };
    }

}

/**
Parses the Secondary Key Schema Arrays into a hash and Range key (if available).
Returns: Boolean, True if succeessfully parsed and added, false otherwise.
**/
DescribeTableHelper.parseSecondaryKeySchema = function parseSecondaryKeySchema(settings, secondaryIndexArray) {
    var temp = {};
    var indexes = Util.getIndexes(settings);
    for (var i = 0; i < secondaryIndexArray.length; i++) {
        temp = secondaryIndexArray[i];
        /*
            The structure will allow us to easily create
            expressions with a given index name.
        */
        indexes[temp.IndexName] = {
            "Hash": {
                "name": temp.KeySchema[0].AttributeName
            }
        }
        if (temp.KeySchema.length === 2) {

            indexes[temp.IndexName].Range = {
                "name": temp.KeySchema[1].AttributeName
            };
        }

    }
    return true;
}
/**
Simple funciton to conver the attribute definitions array into an easily accessable
object for accessing attribute Type.
**/
DescribeTableHelper.convertAttributeDefinitionsToObject = function convertAttributeDefinitionsToObject(attributeDefinitionsArray) {
    //Lets conver the Attribute definitions into a object that we can easily use.
    var AttributeDefinitionsObject = {};
    var temp = {};
    for (var i = 0; i < attributeDefinitionsArray.length; i++) {
        temp = attributeDefinitionsArray[i];
        AttributeDefinitionsObject[temp.AttributeName] = temp.AttributeType;
    }
    return AttributeDefinitionsObject;
}

/**
Parse the array in the TableObject that tells us what the datatype for each
index is.
**/
DescribeTableHelper.parseAttributeDefinitions = function parseAttributeDefinitions(settings, attributeDefinitionsArray) {
    //Given the attribute definitions array, lets go through and match it to our indexes.
    var temp = {};
    var Indexes = Util.getIndexes(settings);
    var attributeObject = DescribeTableHelper.convertAttributeDefinitionsToObject(attributeDefinitionsArray);
    //We need to pull out all the indexes and go through them.
    var topIndexNames = Object.keys(Indexes);
    var tempIndexName = "";
    var tempObject = {};
    for (var i = 0; i < topIndexNames.length; i++) {
        tempIndexName = topIndexNames[i];
        tempObject = Indexes[tempIndexName];

        if (tempObject.Hash) {
            //Get the datatype for the hash.
            tempObject.Hash.datatype = attributeObject[tempObject.Hash.name];
        }
        if (tempObject.Range) {
            //Get the datatype for the range.
            tempObject.Range.datatype = attributeObject[tempObject.Range.name];
        }

    }
}

/**
Given the value of the "Table" key from a DescriptionTable response, this function
will parse the important data out for DynaDoc to go through and use for the table.
This will be a challenge, but would be an amazing feature.
@TODO Use attribute definitions in other methods to check index values to ensure they are correct (Optional).
**/
DescribeTableHelper.parseTableDescriptionResponse = function parseTableDescriptionResponse(settings, TableObject) {
    if (!TableObject) {
        throw new Error('ERROR: TableObject is not defined! No way to parse it!');

    } else if (!settings) {
        throw new Error('ERROR: Settings is not defined!');

    }

    //Make sure settings reflects this table name.
    settings.TableName = TableObject.TableName;

    //Lets pull out the primary hash schema.
    //Array object to describe the primary key (hash with or without Range.) [0] is Primary, [1] is range
    var PrimaryHashSchema = TableObject.KeySchema;
    //Array of the LocalSecondaryIndexs that this table has.
    var LocalSecondaryIndexes = TableObject.LocalSecondaryIndexes;
    //The global Secondary Indexes available in this table.
    var GlobalSecondaryIndexes = TableObject.GlobalSecondaryIndexes;
    //Defines the data type for each index (only defined in this, not inside individual indexe objects for some silly reason).
    var AttributeDefinitions = TableObject.AttributeDefinitions;

    //Get the primary hash key and range key into indexes.
    DescribeTableHelper.parsePrimaryKeySchema(settings, TableObject.KeySchema);

    //Get LocalSecondaryIndexes setup.
    if (TableObject.LocalSecondaryIndexes) {
        DescribeTableHelper.parseSecondaryKeySchema(settings, TableObject.LocalSecondaryIndexes);
    }

    if (TableObject.GlobalSecondaryIndexes) {
        DescribeTableHelper.parseSecondaryKeySchema(settings, TableObject.GlobalSecondaryIndexes);
    }

    //Now that we have all the indexes, we can setup the attribute values and know what each index should be.
    DescribeTableHelper.parseAttributeDefinitions(settings, TableObject.AttributeDefinitions);
}

module.exports = DescribeTableHelper;

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


Functions for validating a DynaDoc model.

@author: Evan Boucher
@copyright: Mohu Inc.
**/


/*
@TODO Need to implement models for DynaDoc.

Currently, I think that models are a bad word for what DynaDoc will provide.
Instead, the actually DynaClient will represent a Table that can validate
objects that are passed through it or from it. IE. DynaClient will contain
a model that it compares input to. This will also allow for table creation.
*/

var path = require('path');
const LIB_FOLDER = __dirname + "/../";
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

const INNER = "_inner";
const TYPE = "_type";
const KEY = "key";
const SCHEMA = "schema";
//A schema for a JOI array object.
const ITEMS = "items";
//The inners of an array object.
const CHILDREN = "children";

const OBJECT = "object";
const ARRAY = "array";
//Thought about using the tags to create indexes
const TAGS = "_tags";
const META = "_meta";

/**
DynaDoc will depend on the popular validation library known as Joi to
create a valid schema and compare that Schema to the one DynaDoc was Created
with.
**/
var Joi = require('joi');
var validator = {};


/**
Parses a schema object for Joi and adds it to The
payload recursively.
**/
function parseSingleSchema(schema, payload, index) {
    if (schema.key) {
        //We there is a key, then we have a name we should add.
        payload[schema.key] = {
            "type": Util.convertTypeToDynamoType(schema[SCHEMA][TYPE])
        };

        //We need to pull the tags and get the Index tags out.
        if (schema[SCHEMA]) {
        //There is a schema with this key.
            parseSingleSchema(schema[SCHEMA], payload[schema.key], index);
        }
    }

    //Now we need to figure out what the next layer of the schema is.
    if (schema[INNER]) {
        //There is an inner schema (object)
        if (schema[INNER][CHILDREN]) {
            if (index >= schema[INNER][CHILDREN].length) {
                //Finished parsing the childrens array.
                return;
            }
            for (var i = 0; i < schema[INNER][CHILDREN].length; i++) {
                //This is an array (The root inner object is always an array)
                parseSingleSchema(schema[INNER][CHILDREN][i], payload, i);
            }


            return;
        } else if (schema[INNER][ITEMS]) {
            for (var i = 0; i < schema[INNER][ITEMS].length; i++) {
                //This is an array (The root inner object is always an array)
                parseSingleSchema(schema[INNER][ITEMS][i], payload, i);
            }
        }
        //There were no children inside the inner element.
        return;
    } else {
        //There is no inner so we reached the bottom of this branch.
        return;
    }
}

validator.parseJoiSchema = function parseJoiSchema(schema) {
    //Return the parsed Schema into a DynaDoc readable object.
    var dymodelObject = {};
    if (!schema.isJoi) {
        throw Util.createError('Model passed in is not a valid Joi Schema!');
    }
    parseSingleSchema(schema, dymodelObject, 0);
    return dymodelObject;

}

module.exports = validator;

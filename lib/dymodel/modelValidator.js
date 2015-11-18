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
const LIB_FOLDER = __dirname + "/../" ;
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));



/**
DynaDoc will depend on the popular validation library known as Joi to
create a valid schema and compare that Schema to the one DynaDoc was Created
with.
**/
var Joi = require('joi');
var validator = {};

function errorCheck(err) {
    if (err != null) {
        //There was an error in validation.
        throw err;
    }
}

/**
Validates a model.
**/
validator.validate = function validate(object, schema) {
    /*
    @TODO Decided if we shoud use Joi.assert(object, schema,"DynaDocValidation: ");
    or the simple validate option. Assert throws the error (which is what we are
    doing to begin with)
    Joi.attempt appears to do the same thing as below.
    */
    //Throws an error if the object is not valid.
    Joi.assert(object, schema, Util.ERROR_MESSAGE_PREFIX);
    //Return the object if it is valid.
    return object;
    /*
    //Returns the original object in result.value (if valid), throws error otherwise.
    return Joi.validate(object, schema, function(err, value) {
        errorCheck(err);
    });
    */
};

/**
Compile a Joi schema.
**/
validator.validateSchema = function validateSchema(schema) {
    //We need to make sure that schemas passed in are indeed valid Joi schemas.
    //Maybe? Joi might do this already.
}

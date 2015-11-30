/*
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

Factory object that creates new clients with the given AWS object.

@author: Evan Boucher
@copyright: Mohu Inc.
@Created: 10/28/2015
@version: 0.4.0
*/
//to create path names.
var path = require('path');
//The location of the lib folder.
var LIB_FOLDER = path.join(__dirname, "/lib/");

var Util = require(path.join(LIB_FOLDER, 'util'));
//Get the DynaClient constructor.
var DynaClient = require(path.join(LIB_FOLDER, 'dynadoc-client'));
//Require Joi so our users will not have too.
var Joi = require('joi');

//Singleton factory constructor
function DynaFactory() {

};

/**
Setups the Factory with the AWS object. This must be called before any
other call.
@param AWS (Object): The AWS SDK object with valid keys and region.
**/
DynaFactory.prototype.setup = function setup(AWS) {
    DynaFactory.AWS = AWS;
}

/**
Creates a new DynaClient for a table.

@param tableName (String): The string name of the table to parse.
@param model (Object): Joi schema that represents the Table Object. [Optional]
@param readThroughput (integer): The number of read unites for this table.  [Optional]
@param writeThroughput (integer): The number of write units for this table. [Optional]

@returns DynaClient (Object): The client for communicating with this table.
**/
DynaFactory.prototype.createClient = function createClient(tableName, model, readThroughput, writeThroughput) {
    if (!DynaFactory.AWS) {
        //The setup method has not been called.
        throw Util.createError('Setup method has not yet been called! Cannot create Client.');
    }
    return new DynaClient(DynaFactory.AWS, tableName, model, readThroughput, writeThroughput);
}

/**
Returns the instance of Joi to be used with schema creation.
**/
DynaFactory.prototype.getJoi = function getJoi() {return Joi};

exports = module.exports = new DynaFactory();

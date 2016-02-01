"use strict";
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
//Not using const yet to better support older versions. Option Prefix.
var OPTION_TABLE_PREFIX = "TablePrefix";

//Singleton factory constructor
function DynaFactory() {
    this.AWS = null;
    this.options = {};
};

/**
Setups the Factory with the AWS object. This must be called before any
other call.
@param AWS (Object): The AWS SDK object with valid keys and region.
**/
DynaFactory.prototype.setup = function setup(AWS) {
    DynaFactory.AWS = AWS;
    return this;
}

/**
A function for setting global options for DynaDoc. Options include:
TablePrefix <String>: A table prefix string that is applied to every
     table created by any client made.
**/
DynaFactory.prototype.setGlobalOptions = function setGlobalOptions(options) {
    if (options.hasOwnProperty(OPTION_TABLE_PREFIX)) {
        this.options[OPTION_TABLE_PREFIX] = options[OPTION_TABLE_PREFIX];
    }
    return this;
}
/**
Remove a global option from DynaDoc.
Return true if the option was found and removed.
False if the option was not found.
**/
DynaFactory.prototype.removeGlobalOption = function removeGlobalOption(optionName) {
    if (this.options.hasOwnProperty(optionName)) {
        delete this.options[optionName];
    }
    return this;
}

/**
Returns the value of a global option given its name.
**/
DynaFactory.prototype.getGlobalOption = function getGlobalOption(optionName) {
    if (this.options.hasOwnProperty(optionName)) {
        return this.options[optionName]
    }
    return null;
}
/**
Checks if DynaDoc has a global options set or not.
Return true if the option exists and false otherwise.
**/
DynaFactory.prototype.hasGlobalOption = function hasGlobalOption(optionName) {
    if (this.options.hasOwnProperty(optionName)) {
        return true;
    }
    return false;
}


/**
Creates a new DynaClient for a table.

@param tableName (String): The string name of the table to parse.
@param model (Object): Joi schema that represents the Table Object. [Optional]
@param options     (String): Options for creating a client.
 - readCapacity (integer): The number of read unites for this table.  [Optional]
 - writeCapacity (integer): The number of write units for this table. [Optional]

@returns DynaClient (Object): The client for communicating with this table.
**/
DynaFactory.prototype.createClient = function createClient(tableName, model, options) {
    if (DynaFactory.AWS === null) {
        //The setup method has not been called.
        throw Util.createError('Setup method has not yet been called! Cannot create Client.');
    }
    //Append options.
    if (this.hasGlobalOption(OPTION_TABLE_PREFIX)) {
        tableName = this.getGlobalOption(OPTION_TABLE_PREFIX) + tableName;
    }

    return new DynaClient(DynaFactory.AWS, tableName, model, options);
}

/**
Returns the instance of Joi to be used with schema creation.
**/
DynaFactory.prototype.getJoi = function getJoi() {return Joi};

exports = module.exports = new DynaFactory();

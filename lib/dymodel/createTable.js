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


Functions for creating a DynamoDB table.

http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#createTable-property

@author: Evan Boucher
@copyright: Mohu Inc.
**/

//Functions to create a table.

var path = require('path');
const LIB_FOLDER = __dirname + "/../" ;
//Get the DynaDoc utilities.
var Util = require(path.join(LIB_FOLDER, "util.js"));

var CreateTableHelper = {};

CreateTableHelper.doesTableExist = function doesTableExist(TableName) {
    //Lets check if a table exists, return true or false.

}
//Returns the payload to create a table. The starts of a true ORM?
CreateTableHelper.createTable = function createTable(TableName, tableObject) {

}

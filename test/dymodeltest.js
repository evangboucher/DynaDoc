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


Main test file for DynaDoc's model features.
Model features are optional (you can use DynaDoc without even touching them)

@author: Evan Boucher
@copyright: Mohu Inc.
**/


var Chai = require("chai");
var chaiAsPromised = require('chai-as-promised');
Chai.use(chaiAsPromised);

//Several chai objects to be used for testing.
var expect = Chai.expect;
var assert = Chai.assert;
var should = Chai.should();
var path = require('path');
var ROOT_DIR = __dirname + "/../";
//Pull in the test data we will use.
var testData = require(path.join(__dirname, 'test_data.js'));

var DynaDoc = require(path.join(ROOT_DIR, "dynadoc.js"));
//The AWS object to initialize DynaDoc with.
var AWS = require('aws-sdk');

//If you want to use a file it is possible, but Travis CI uses env variables.
//AWS.config.loadFromPath(path.join(__dirname, 'awscreds.json'));
//Check that we have the necessary env variables.
var envCheck = false;
if (process.env.accessKeyId && process.env.secretAccessKey) {
    AWS.config.update({
        "accessKeyId": process.env.accessKeyId,
        "secretAccessKey": process.env.secretAccessKey,
        "region": "us-east-1"
    })
    envCheck = true;
} else {
    //If you want to use a file it is possible, but Travis CI uses env variables.
    AWS.config.loadFromPath(path.join(__dirname, 'awscreds.json'));
    envCheck = true;
}
if (!envCheck) {
    throw new Error('No secret key was found for DynamoDB. Unable to test.');
}


var dynaClient = new DynaDoc(AWS, testData.TABLE_NAME1, testData.t1Schema, 2, 2);
//Requirement to ensure that dynaclient is setup properly.
dynaClient.describeTable();

//The default timeout for every call.
var DEFAULT_TIMEOUT = 3500;

describe('DyModel Test Suite', function () {
    describe('#DyModel Creation', function() {
        it('Create basic DyModel for Table 1', function(done) {
            //@TODO Implement a simple test to see if models work.
            //console.log(JSON.stringify(dynaClient.dymodel.toSimpleObject(), null, 4));
            dynaClient.ensurePrimaryIndex("PrimaryHashKey", "PrimaryRangeKey", 1, 1);

            done();
        });
    });
});

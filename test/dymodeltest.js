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
The tests in this suite will take a while (almost a minute). This is to ensure
to give DynamoDB enough time to create and delete the tables made from the
model. The tables created and removed are then used to test on.

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

var randomMax =1000;

var dynaTable1 = new DynaDoc(AWS, testData.TABLE_NAME1 + (Math.floor(Math.random()*randomMax)+5), testData.t1Schema, 3, 3);
var dynaTable2 = new DynaDoc(AWS, testData.TABLE_NAME2 + (Math.floor(Math.random()*randomMax)+5), testData.t2Schema, 2, 2);

//The default timeout for every call.
var DEFAULT_TIMEOUT = 3500;

describe('DyModel Test Suite', function() {

    describe('#DyModel Creation', function() {
        this.timeout(30000);
        it('Create basic DyModel for Table 1', function(done) {
            //Ensure the important indexes that we want.
            dynaTable1.ensurePrimaryIndex("PrimaryHashKey", "PrimaryRangeKey");
            dynaTable1.ensureGlobalIndex("GlobalSecondaryHash", "GlobalSecondaryRange", 1, 1, testData.t1GlobalIndexName);
            dynaTable1.ensureLocalIndex("LocalSecondaryIndex", testData.t1LocalIndexName);

            dynaTable1.createTable(true).then(function(res) {
                //DynamoDB alwasy instantly returns.
                setTimeout(function() {
                    //Wait for the table to be created.
                    done();
                    return;
                }, 10000);

            }, function(err) {
                done(err);
                return;
            });
        });

        it('Create Table 2 from model.', function(done) {
            dynaTable2.ensurePrimaryIndex("CustomerID");

            try {
                dynaTable2.createTable(true).then(function(res) {
                    //DynamoDB alwasy instantly returns.
                    setTimeout(function() {
                        //Wait for the table to be created.
                        done();
                        return;
                    }, 10000);

                }, function(err) {
                    if (err.code === "ResourceInUseException") {
                        console.log("The table already exists!");
                        done();
                        return;
                    }
                    done(err);
                    return;
                });
            } catch (err) {
                if (err.code === "ResourceInUseException") {
                    console.log("The table already exists!");
                    done();
                    return;
                }
            }

        });

        it('Check Table 1 active state.', function(done) {
            dynaTable1.isTableActive().then(function(res) {
                if (res) {
                    //Table is active.
                    done();
                    return;
                } else {
                    //table is not active.
                    done(res);
                    return;
                }

            });


        });

        it('Check Table 2 active state.', function(done) {
            dynaTable2.isTableActive().then(function(res) {
                if (res) {
                    //table is active.
                    done();
                    return;
                } else {
                    //table is not active.
                    done(res);
                    return;
                }

            });


        });
    });

    describe('#Delete Main Tables', function() {
        this.timeout(15000);

        it('Delete Table 1', function(done) {
            //Success. THe table is being deleted Asyncrounously.
            /*
            This has been really painful. Mocha will fail every test here
            because it catches the uncaught error (Resource not found or
            resource in use (already being deleted) even if I try to catch
            it first. This is likely because of NodeJS event listeners. I
            have not found a good way to remove and ignore these event listeners.

            Until I figure this out, we will use DynaDoc's isTableActive to
            see if a table exists.
            */
            dynaTable1.isTableActive().then(function(res) {
                //Success.
                console.log('The table is active.')
                dynaTable1.deleteTable();
                setTimeout(function() {
                    //Wait for the table to be deleted.
                    done();
                }, 10000);
            }, function(err) {
                console.log('There was an error and the table is not active.')
                done();
            });


        });

        it('Delete Table 2', function(done) {
            dynaTable2.isTableActive().then(function(res) {
                //Success.
                console.log('The table is active.')
                dynaTable2.deleteTable();
                setTimeout(function() {
                    //Wait for the table to be deleted.
                    done();
                }, 10000);
            }, function(err) {
                console.log('There was an error and the table is not active.')
                done();
            });
        });
    });

});

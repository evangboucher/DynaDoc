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


The main test suite for DynaDoc.
This file will call and run all other tests suites.

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



var dynaClient = new DynaDoc(AWS, testData.TABLE_NAME1);
//Requirement to ensure that dynaclient is setup properly.
dynaClient.describeTable();

//The default timeout for every call.
var DEFAULT_TIMEOUT = 3500;

//The main test suites.

/*
Template for async promise tests:

.then(function(result) {
    try {

    } catch(err) {
        done(err);
        return;
    }
    done();
}, function(err) {
    done(err);
});
*/


describe("DynaDoc", function() {
    this.timeout(DEFAULT_TIMEOUT);
    //Do a big batchwrite first to put all the data in the two tables.

    describe('#BatchWrite', function() {
        it('BatchWrite a few things.', function(done) {
            var payload = {
                RequestItems: {}
            };
            payload.RequestItems[testData.TABLE_NAME1] = [{
                "PutRequest": {
                    "Item": testData.t1Data[0]
                }
            }, {
                "PutRequest": {
                    "Item": testData.t1Data[1]
                }
            }, {
                "PutRequest": {
                    "Item": testData.t1Data[2]
                }
            }]

            return dynaClient.batchWrite(payload).then(function(result) {
                try {
                    expect(result).to.have.property("UnprocessedItems");
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "BatchWrite Failed to write data!");
                done(err);
            });
        });
    });



    describe("#Smart Query", function() {

        it("Smart Query with all params.", function(done) {

            var expected;
            return dynaClient.smartQuery("GlobalSecondary-index",
                testData.t1Data[0].GlobalSecondaryHash,
                testData.t1Data[0].GlobalSecondaryRange,
                "=",
                12).then(function(result) {
                /*
                For some reason returning the promise in above does not
                catch the assertions that happen when the test fails.
                For now these try and catch blocks in these functions will
                suffice for what we need. We can change them later.
                */
                try {
                    expect(result).to.have.property("Items");
                    expect(result).to.have.property("Count", 1);
                    expect(result).to.have.property("ScannedCount", 1);
                    assert.strictEqual(result.Items[0].PrimaryHashKey, testData.t1Data[0].PrimaryHashKey);
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "smartQuery failed to get items!");
                done(err);
            });
        });

        it("SmartQuery Local Secondary Index.", function(done) {
            return dynaClient.smartQuery("LocalSecondaryIndex-index",
                testData.t1Data[1].PrimaryHashKey,
                testData.t1Data[1].LocalSecondaryIndex).then(function(result) {
                //Check the secondary values.
                try {
                    expect(result).to.have.property("Items");
                    expect(result).to.have.property("Count", 1);
                    expect(result).to.have.property("ScannedCount", 1);
                    assert.strictEqual(result.Items[0].LocalSecondaryIndex,
                        testData.t1Data[1].LocalSecondaryIndex);
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmartQuery failed to get items!");
                done(err);
            });
        });

        it("SmartQuery test Primary Index", function(done) {
            return dynaClient.smartQuery(dynaClient.PrimaryIndexName,
                testData.t1Data[1].PrimaryHashKey,
                testData.t1Data[1].PrimaryRangeKey).then(function(result) {
                try {
                    expect(result).to.have.property("Items");
                    expect(result).to.have.property("Count", 1);
                    expect(result).to.have.property("ScannedCount", 1);
                    assert.strictEqual(result.Items[0].PrimaryRangeKey,
                        testData.t1Data[1].PrimaryRangeKey);
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmartQuery failed to get primary key items.");
                done(err);
            });
        })
    });

    describe("#SmartBetween", function() {
        it("SmartBetween Valid", function(done) {
            return dynaClient.smartBetween(dynaClient.PrimaryIndexName,
                testData.t1Data[1].PrimaryHashKey,
                testData.t1Data[1].PrimaryRangeKey,
                testData.t1Data[2].PrimaryRangeKey, 5).then(function(result) {
                try {
                    expect(result).to.have.property("Items");
                    expect(result).to.have.property("Count", 2);
                    expect(result).to.have.property("ScannedCount", 2);
                    assert.strictEqual(result.Items[0].PrimaryRangeKey, testData.t1Data[1].PrimaryRangeKey);
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmartBetween failed to get items.");
                done(err);
            });
        })
    });

    describe("#Describe Table", function() {
        it("Descirbe Table with no table name", function(done) {
            var result;
            //Describe the table.
            var promise = dynaClient.describeTable();
            promise.then(function(result) {
                try {
                    expect(result).to.have.property("Table");
                } catch (err) {
                    done(err);
                }

                done();
            }, function(err) {
                assert.fail(err, null, "DescribeTable failed to get table details.");
                done(err);
            });
        });

        it("Describe Table should return Table Object.", function(done) {
            dynaClient.describeTable(testData.TABLE_NAME2).then(function(result) {
                try {
                    expect(result).to.have.property("Table");
                } catch (err) {
                    done(err);
                }

                done();
            }, function(err) {
                assert.fail(err, null, "DescribeTable Failed to get table Details.");
                done(err);
            });
        });

    });

    describe("#PutItem", function() {

        it("Put a simple item", function(done) {
            return dynaClient.putItem(testData.t2Data[0]).then(function(result) {
                try {
                    //Put item should currently return an empty object.
                    expect(result).to.be.empty;
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "Put Item failed to place the item in the database.");
                done(err);
            });
        });

        it("Put Another Item", function(done) {
            return dynaClient.putItem(testData.t2Data[1]).then(function(result) {
                try {
                    expect(result).to.be.empty;
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "PutItem Failed to place the item in the database.");
                done(err);
            });
        })
    });

    describe('#GetItem', function() {
        it('Get the item we just put.', function(done) {
            return dynaClient.getItem({
                "CustomerID": testData.t2Data[0].CustomerID
            }).then(function(result) {
                try {
                    expect(result).to.have.property("Item");
                    expect(result.Item).to.have.property("timestamp");
                    expect(result.Item.timestamp[0]).to.have.property("value", testData.t2Data[0].timestamp[0].value);
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "GetItem failed to retrieve the item.");
                done(err);
            });
        });
    });



    describe('#BatchGet', function() {
        it('Batch Get a few items.', function(done) {
            var payload = {
                "RequestItems": {

                }
            };
            payload.RequestItems[testData.TABLE_NAME2] = {
                "Keys": [{
                    "CustomerID": testData.t2Data[0].CustomerID
                }, {
                    "CustomerID": testData.t2Data[1].CustomerID
                }]
            };

            return dynaClient.batchGet(payload).then(function(result) {
                try {
                    expect(result).to.have.property("Responses");
                    expect(result).to.have.property("UnprocessedKeys");
                    expect(result.Responses[testData.TABLE_NAME2]).to.have.length(2);
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "BatchGet failed to get the item(s).");
                done(err);
            });
        });
    });

    describe('#SmartBatchWrite', function() {
        it('Write to one table.', function(done) {
            var tableArray = [testData.TABLE_NAME1];
            var putItemsObject = {};
            putItemsObject[testData.TABLE_NAME1] = [testData.t1Data[3], testData.t1Data[2], testData.t1Data[1]];
            return dynaClient.smartBatchWrite(tableArray, putItemsObject).then(function(result) {
                try {
                    expect(result).to.have.property("UnprocessedItems").to.be.empty;
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmartBatchWrite failed to write the items to the database.");
                done(err);
            });
        });
        it('Batch Delete two items from the previous call.', function(done) {
            var tableArray = [testData.TABLE_NAME1];
            var deleteItemsObject = {};
            deleteItemsObject[testData.TABLE_NAME1] = [testData.generateKeyObjectsTable1(3), testData.generateKeyObjectsTable1(2)];

            return dynaClient.smartBatchWrite(tableArray, undefined, deleteItemsObject).then(function(result) {
                try {
                    expect(result).to.have.property("UnprocessedItems").to.be.empty;
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmartBatchWrite failed to write the items to the database.");
                done(err);
            });
        });

        it('Batch Delete from two tables and write to both.', function(done) {
            var tableArray = [testData.TABLE_NAME1, testData.TABLE_NAME2];
            var putItemsObject = {};
            putItemsObject[testData.TABLE_NAME1] = [testData.t1Data[3], testData.t1Data[2], testData.t1Data[1]];
            putItemsObject[testData.TABLE_NAME2] = [testData.t2Data[1]];
            var deleteItemsObject = {};
            deleteItemsObject[testData.TABLE_NAME2] = [testData.generateKeyObjectsTable2(3), testData.generateKeyObjectsTable2(2)];

            return dynaClient.smartBatchWrite(tableArray, putItemsObject, deleteItemsObject).then(function(result) {
                try {
                    expect(result).to.have.property("UnprocessedItems").to.be.empty;
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmartBatchWrite failed to write the items to the database.");
                done(err);
            });
        })

        it('Write to two tables.', function(done) {
            var tableArray = [testData.TABLE_NAME1, testData.TABLE_NAME2];
            var putItemsObject = {};
            putItemsObject[testData.TABLE_NAME1] = [testData.t1Data[3], testData.t1Data[2], testData.t1Data[1]];
            putItemsObject[testData.TABLE_NAME2] = [testData.t2Data[3], testData.t2Data[2], testData.t2Data[1]];

            return dynaClient.smartBatchWrite(tableArray, putItemsObject).then(function(result) {
                try {
                    expect(result).to.have.property("UnprocessedItems").to.be.empty;
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmartBatchWrite failed to write the items to the database.");
                done(err);
            });
        });

    });

    describe('#SmartBatchGet', function() {
        it("Get several items from the tables.", function(done) {
            var tableArray = [testData.TABLE_NAME1, testData.TABLE_NAME2];
            var batchGetKeyObject = {};
            batchGetKeyObject[testData.TABLE_NAME1] = [testData.generateKeyObjectsTable1(3), testData.generateKeyObjectsTable1(2), testData.generateKeyObjectsTable1(1)];
            batchGetKeyObject[testData.TABLE_NAME2] = [testData.generateKeyObjectsTable2(3), testData.generateKeyObjectsTable2(2), testData.generateKeyObjectsTable2(1)];
            return dynaClient.smartBatchGet(tableArray, batchGetKeyObject).then(function(result) {
                try {
                    expect(result).to.have.property("UnprocessedKeys");
                    expect(result.UnprocessedKeys).to.be.empty;
                    expect(result).to.have.property("Responses");
                    expect(result.Responses).to.have.property(testData.TABLE_NAME2);
                    expect(result.Responses[testData.TABLE_NAME2]).to.not.be.empty;
                    expect(result.Responses).to.have.property(testData.TABLE_NAME1);
                    expect(result.Responses[testData.TABLE_NAME1]).to.not.be.empty;
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmartBatchGet Failed to get the items from the database.");
                done(err);
            });
        });

        it('Get Items that do not exist from both tables.', function(done) {
            var tableArray = [testData.TABLE_NAME1, testData.TABLE_NAME2];
            var batchGetKeyObject = {};
            batchGetKeyObject[testData.TABLE_NAME1] = [testData.generateNonExistentKeyObjectsTable1(1), testData.generateNonExistentKeyObjectsTable1(2)];
            batchGetKeyObject[testData.TABLE_NAME2] = [testData.generateNonExistentKeyObjectsTable2(1), testData.generateNonExistentKeyObjectsTable2(2)];
            return dynaClient.smartBatchGet(tableArray, batchGetKeyObject).then(function(result) {
                try {
                    expect(result).to.have.property("UnprocessedKeys");
                    expect(result.UnprocessedKeys).to.be.empty;
                    expect(result).to.have.property("Responses");
                    expect(result.Responses).to.have.property(testData.TABLE_NAME2);
                    expect(result.Responses[testData.TABLE_NAME2]).to.be.empty;
                    expect(result.Responses).to.have.property(testData.TABLE_NAME1);
                    expect(result.Responses[testData.TABLE_NAME1]).to.be.empty;
                } catch (err) {
                    done(err);
                    return;
                }
                done();
            }, function(err) {
                assert.fail(err, null, "SmarBatchGet Failed to make the query to the database.");
                done(err);
            });
        });

        /*
        Currently, this test does not work as the error is thrown up.
        I have not been able to catch it and make the test pass.
        It will be skipped for now until it actually works.
        */
        it.skip('Pass invalid Key Object.', function(done) {
            var tableArray = [testData.TABLE_NAME1];
            var batchGetKeyObject = {};

            batchGetKeyObject[testData.TABLE_NAME1] = [{
                "InvalidKey": 928392
            }];

            /*
            batchGetKeyObject[testData.TABLE_NAME1] = [testData.generateNonExistentKeyObjectsTable1(1), testData.generateNonExistentKeyObjectsTable1(2)];
            */
            dynaClient.smartBatchGet(tableArray, batchGetKeyObject).then(function(result) {
                //This is the fail case.
                done(new Error('DynaDoc SmartBatchGet accepted invalid key data and did not throw an error'));
            }, function(err) {
                //Called because the response should fail.
                done();
            });

        });
    });
});

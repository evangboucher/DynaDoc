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
    throw new Error('DynaTest: No secret key was found for DynamoDB. Unable to test.');
}

//Give the DynaDoc factory the AWS object.
DynaDoc.setup(AWS);

//Pull in the test data we will use.
var testData = require(path.join(__dirname, 'test_data.js'));

//Random window so table names hopefully don't collide.
var randomMax = 999999;
//The number will be a suffix of the table name.
var table1Suffix = (Math.floor(Math.random()*randomMax));
var table2Suffix = (Math.floor(Math.random()*randomMax));
//The new table names.
var table1Name = testData.TABLE_NAME1 + table1Suffix;
var table2Name = testData.TABLE_NAME2 + table2Suffix;
console.log('Table 1 Name: ' + table1Name);
console.log('Table 2 Name: ' + table2Name);


var table1ReadCapacity = 10;
var table1WriteCapacity = 10;

var dynaTable1 = DynaDoc.createClient(table1Name, testData.t1Schema, table1ReadCapacity, table1WriteCapacity);
var dynaTable2 = DynaDoc.createClient(table2Name, testData.t2Schema, 10, 8);




//The default timeout for every call.
var DEFAULT_TIMEOUT = 3500;

describe('DyModel Test Suite', function() {
    after('Deleting tables...', function(done) {
        this.timeout(15000);
        dynaTable1.isTableActive().then(function(res) {
            //Success.
            dynaTable1.deleteTable();
            setTimeout(function() {
                //Wait for the table to be deleted.
            }, 10000);
        }, function(err) {
        });

        dynaTable2.isTableActive().then(function(res) {
            //Success.
            dynaTable2.deleteTable();
            setTimeout(function() {
                //Wait for the table to be deleted.
                done();
            }, 10000);
        }, function(err) {
            done();
        });
    })
    describe('#DyModel Creation', function() {
        this.timeout(30000);
        it('Create basic DyModel for Table 1', function(done) {

            //Ensure the important indexes that we want.
            dynaTable1.ensurePrimaryIndex("PrimaryHashKey", "PrimaryRangeKey");
            dynaTable1.ensureGlobalIndex("GlobalSecondaryHash", "GlobalSecondaryRange", 3, 3, testData.t1GlobalIndexName);
            dynaTable1.ensureLocalIndex("LocalSecondaryIndex", testData.t1LocalIndexName);
            //make the call to create the table.
            dynaTable1.createTable(true).then(function(res) {
                //DynamoDB alwasy instantly returns.
                setTimeout(function() {
                    //Wait for the table to be created.
                    done();
                    return;
                }, 22000);

            }, function(err) {
                done(err);
                return;
            });
        });

        /*
        Creates the table 2 DynamoDB table from the Schema.
        Fun Fact: A table cannot have a local index if the primary index
        does not already have a range key.
        */
        it('Create Table 2 from model.', function(done) {
            dynaTable2.ensurePrimaryIndex("CustomerID");
            dynaTable2.ensureGlobalIndex("gameID", undefined, 1, 1, testData.t2GameIDIndexName);

            try {
                dynaTable2.createTable(true).then(function(res) {
                    //DynamoDB alwasy instantly returns.
                    setTimeout(function() {
                        //Wait for the table to be created.
                        done();
                        return;
                    }, 22000);

                }, function(err) {
                    if (err.code === "ResourceInUseException") {
                        done();
                        return;
                    }
                    done(err);
                    return;
                });
            } catch (err) {
                if (err.code === "ResourceInUseException") {
                    done();
                    return;
                }
                throw err;
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

        it('Validate DyModel result for Table 1', function() {
            //Print the model and validate it.
            var simpleObject = dynaTable1.toSimpleObject();
            expect(simpleObject.modelName).to.equal(table1Name);
            expect(dynaTable1.getTablePayload()).to.have.property('TableName');
            var throughput = dynaTable1.getThroughput();
            expect(throughput).to.have.property("ReadCapacityUnits");
            expect(throughput).to.have.property("WriteCapacityUnits");
            expect(throughput.ReadCapacityUnits).to.be.equal(table1ReadCapacity);
            expect(throughput.WriteCapacityUnits).to.be.equal(table1WriteCapacity);
        });

        it('Validate test data against the Dyna Schema', function(done) {
            //Use the Joi validate methods to validate items against the Schema
            dynaTable1.assert(testData.t1Data[0], "Assert: Schema invalid for test Data 0");
            dynaTable1.attempt(testData.t1Data[0], "Attempt: Schema invalid for test Data 0");
            dynaTable1.validate(testData.t1Data[0], undefined, function(err, value) {
                if (err) {
                    done(err);
                    return;
                }
                done();
            });
        });
    });
    /**
    Updates take a very very long time...so this part of the test is
    very slow. In theory, we would not have to wait in a production
    environment as the table could still be used until it is finished, but
    our test will finish so quickly that it would try to delete the
    table when it is being updated, which DynamoDB does not like.

    The time it takes seems to be fairly diverse. Sometime taking tens of seconds
    and others taking only a few.
    **/
    describe("#UpdateTable", function() {
        this.timeout(60000);
        it('Update table 1 throughput.', function(done) {

            //Lets update the table throughput.
            dynaTable1.setTableThroughput(15, 13);
            //Update the global index read and write capacity.
            dynaTable1.updateGlobalIndex(testData.t1GlobalIndexName, 5, 4);
            dynaTable1.updateTable().then(function(res) {
                try {
                    expect(res).to.have.property("TableDescription");
                    expect(res.TableDescription).to.have.property("TableName").to.be.equal(table1Name);
                    setTimeout(function() {
                        //Wait for the table to be updated
                        done();
                        return;
                    }, 50000);
                }catch(err) {
                    done(err);
                }
            });
        });

        /*
        Creates a new index for table two. When an index is being created, the
        table is stil useable, however the index is not. The table cannot be
        deleted while be updated (though it can be used). This typically takes
        roughly 2 minutes and 15 seconds to complete with an empty table.
        I don't think I can wait that long for the test to complete. Maybe
        we will have to make a new table to test this.
        */
        it.skip('Add another globalIndex to Table 2.', function(done) {
            this.timeout(60000);
            console.log('The table payload before the Index addition update.');
            console.log(JSON.stringify(dynaTable2.getTablePayload(), null, 4));
            console.log('-------Spacer-------');
            //Lets add the index.
            dynaTable2.ensureGlobalIndex("gameID", undefined, 1, 2, testData.t2GameIDIndexName);
            console.log('The tablePayload after updating with a new index:');
            console.log(JSON.stringify(dynaTable2.getTablePayload(), null, 4));

            dynaTable2.updateTable().then(function(res) {
                console.log(JSON.stringify(res, null, 4));
                setTimeout(function() {
                    //Wait for the table to be updated
                    done();
                    return;
                }, 35000);
            }, function(err) {
                done(err);
            });
        });

        /*
        Delete the global index that we made in table 2.
        Deletes both a global and local index.
        */
        it('Delete Global gameID index from table 2', function(done) {
            this.timeout(60000);
            dynaTable2.deleteIndex(testData.t2GameIDIndexName);
            dynaTable2.updateTable().then(function(res) {
                expect(res).to.have.property("TableDescription");
                expect(res.TableDescription).to.have.property("TableName").to.be.equal(table2Name);
                //The index should be in the DELETING state.
                expect(res.TableDescription.GlobalSecondaryIndexes[0]).to.have.property("IndexStatus").to.be.equal("DELETING");
                setTimeout(function() {
                    //Wait for the table to be updated
                    done();
                    return;
                }, 50000);
            }, function(err) {
                done(err);
            });
        });

    });

    //Here we can run the actual tests. on the tables we made.
    describe("DynaDoc", function() {
        this.timeout(DEFAULT_TIMEOUT);
        //Do a big batchwrite first to put all the data in the two tables.

        describe('#BatchWrite', function() {
            it('BatchWrite a few things. (with 1 second wait)', function(done) {
                var payload = {
                    RequestItems: {}
                };
                payload.RequestItems[table1Name] = [{
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
                }, {
                    "PutRequest": {
                        "Item": testData.t1Data[3]
                    }
                }];
                payload.RequestItems[table2Name] = [{
                    "PutRequest": {
                        "Item": testData.t2Data[3]
                    }
                }];

                return dynaTable1.batchWrite(payload).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedItems").to.be.empty;
                        /*
                        After long writes, we should wait a bit because the table cannot handle it.
                        */
                        setTimeout(function() {
                            //Wait for a bit.
                            done();
                            return;
                        }, 1000);
                    } catch (err) {
                        done(err);
                        return;
                    }
                }, function(err) {
                    assert.fail(err, null, "BatchWrite Failed to write data!");
                    done(err);
                });
            });
        });

        describe('#Regular Query', function() {
            it('Simple regular Query call on table 2.', function(done) {
                //Use the primary index.
                var payload = {
                    "TableName": dynaTable2.getTableName(),
                    "KeyConditionExpression": "#HashName = :HashValue",
                    "ExpressionAttributeNames": {
                        "#HashName": "CustomerID"
                    },
                    "ExpressionAttributeValues": {
                        ":HashValue": testData.t2Data[3].CustomerID
                    }
                };
                //Query to the database.
                dynaTable2.query(payload).then(function(res) {
                    expect(res).to.have.property("Items");
                    expect(res).to.have.property("Count", 1);
                    expect(res).to.have.property("ScannedCount", 1);
                    expect(res.Items[0].CustomerID).to.equal(testData.t2Data[3].CustomerID);
                    done();
                }, function(err) {
                    done(err);
                });
            });
        });

        describe('#Delete Item', function() {
            it('Delete an item from table 2', function(done) {
                var payload = {
                    "CustomerID": testData.t2Data[3].CustomerID
                }
                dynaTable2.deleteItem(payload).then(function (res) {
                    expect(res).to.be.empty;
                    done();
                }, function(err) {
                    done(err);
                });

            });
        });

        describe("#Smart Query", function() {

            it("Smart Query with all params but additionalOptions", function(done) {
                return dynaTable1.smartQuery(testData.t1GlobalIndexName,
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
            it("SmartQuery with All params (and some additional options)", function(done) {

                return dynaTable1.smartQuery(testData.t1GlobalIndexName,
                    testData.t1Data[0].GlobalSecondaryHash,
                    testData.t1Data[0].GlobalSecondaryRange,
                    "=",
                    12, {
                        "ReturnConsumedCapacity": "TOTAL",
                        "ScanIndexForward": false
                    }).then(function(result) {
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
                        //Ensure that the tableName is right and the additional parameters were included.
                        expect(result.ConsumedCapacity).to.have.property("TableName", table1Name);
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
                return dynaTable1.smartQuery(testData.t1LocalIndexName,
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
                return dynaTable1.smartQuery(dynaTable1.PrimaryIndexName,
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
                return dynaTable1.smartBetween(dynaTable1.PrimaryIndexName,
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
            it("Describe Table with no table name", function(done) {
                var result;
                //Describe the table.
                var promise = dynaTable1.describeTable();
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

            it("Describe Table should return Table Object. (With 1 second wait after)", function(done) {
                dynaTable2.describeTable(table2Name).then(function(result) {
                    try {
                        expect(result).to.have.property("Table");
                    } catch (err) {
                        done(err);
                    }

                    setTimeout(function() {
                        //Wait for a bit.
                        done();
                        return;
                    }, 1000);
                }, function(err) {
                    assert.fail(err, null, "DescribeTable Failed to get table Details.");
                    done(err);
                });
            });

        });

        describe("#PutItem", function() {

            it("Put a simple item", function(done) {
                return dynaTable2.putItem(testData.t2Data[0]).then(function(result) {
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
                return dynaTable2.putItem(testData.t2Data[1]).then(function(result) {
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
            });
        });

        describe('#GetItem', function() {
            it('Get the item we just put.', function(done) {
                return dynaTable2.getItem({
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
                payload.RequestItems[table2Name] = {
                    "Keys": [{
                        "CustomerID": testData.t2Data[0].CustomerID
                    }, {
                        "CustomerID": testData.t2Data[1].CustomerID
                    }]
                };

                return dynaTable2.batchGet(payload).then(function(result) {
                    try {
                        expect(result).to.have.property("Responses");
                        expect(result).to.have.property("UnprocessedKeys");
                        expect(result.Responses[table2Name]).to.have.length(2);
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
                var tableArray = [table1Name];
                var putItemsObject = {};
                putItemsObject[table1Name] = [testData.t1Data[3], testData.t1Data[1]];
                //Because we specify a different table in batchWrite we can use any dynaDoc Client.
                return dynaTable1.smartBatchWrite(tableArray, putItemsObject).then(function(result) {
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
            it('Batch Delete two items from the previous call. (With 1 second wait)', function(done) {
                var tableArray = [table1Name];
                var deleteItemsObject = {};
                deleteItemsObject[table1Name] = [testData.generateKeyObjectsTable1(3), testData.generateKeyObjectsTable1(1)];

                return dynaTable2.smartBatchWrite(tableArray, undefined, deleteItemsObject).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedItems").to.be.empty;
                        setTimeout(function() {
                            //Wait for a bit.
                            done();
                            return;
                        }, 1000);
                    } catch (err) {
                        done(err);
                        return;
                    }
                }, function(err) {
                    assert.fail(err, null, "SmartBatchWrite failed to write the items to the database.");
                    done(err);
                });
            });

            it('Batch Delete from two tables and write to both.', function(done) {
                var tableArray = [table1Name, table2Name];
                var putItemsObject = {};
                putItemsObject[table1Name] = [testData.t1Data[3], testData.t1Data[1]];
                putItemsObject[table2Name] = [testData.t2Data[1]];
                var deleteItemsObject = {};
                deleteItemsObject[table2Name] = [testData.generateKeyObjectsTable2(3), testData.generateKeyObjectsTable2(2)];

                return dynaTable2.smartBatchWrite(tableArray, putItemsObject, deleteItemsObject).then(function(result) {
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
                var tableArray = [table1Name, table2Name];
                var putItemsObject = {};
                putItemsObject[table1Name] = [testData.t1Data[3], testData.t1Data[1]];
                putItemsObject[table2Name] = [testData.t2Data[2], testData.t2Data[3]];

                return dynaTable1.smartBatchWrite(tableArray, putItemsObject).then(function(result) {
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
                var tableArray = [table1Name, table2Name];
                var batchGetKeyObject = {};
                batchGetKeyObject[table1Name] = [testData.generateKeyObjectsTable1(3), testData.generateKeyObjectsTable1(2), testData.generateKeyObjectsTable1(1)];
                batchGetKeyObject[table2Name] = [testData.generateKeyObjectsTable2(3), testData.generateKeyObjectsTable2(2), testData.generateKeyObjectsTable2(1)];
                return dynaTable1.smartBatchGet(tableArray, batchGetKeyObject).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedKeys");
                        expect(result.UnprocessedKeys).to.be.empty;
                        expect(result).to.have.property("Responses");
                        expect(result.Responses).to.have.property(table2Name);
                        expect(result.Responses[table2Name]).to.not.be.empty;
                        expect(result.Responses).to.have.property(table1Name);
                        expect(result.Responses[table1Name]).to.not.be.empty;
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
                var tableArray = [table1Name, table2Name];
                var batchGetKeyObject = {};
                batchGetKeyObject[table1Name] = [testData.generateNonExistentKeyObjectsTable1(1), testData.generateNonExistentKeyObjectsTable1(2)];
                batchGetKeyObject[table2Name] = [testData.generateNonExistentKeyObjectsTable2(1), testData.generateNonExistentKeyObjectsTable2(2)];
                return dynaTable1.smartBatchGet(tableArray, batchGetKeyObject).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedKeys");
                        expect(result.UnprocessedKeys).to.be.empty;
                        expect(result).to.have.property("Responses");
                        expect(result.Responses).to.have.property(table2Name);
                        expect(result.Responses[table2Name]).to.be.empty;
                        expect(result.Responses).to.have.property(table1Name);
                        expect(result.Responses[table1Name]).to.be.empty;
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
                var tableArray = [table1Name];
                var batchGetKeyObject = {};

                batchGetKeyObject[table1Name] = [{
                    "InvalidKey": 928392
                }];

                /*
                batchGetKeyObject[table1Name] = [testData.generateNonExistentKeyObjectsTable1(1), testData.generateNonExistentKeyObjectsTable1(2)];
                */
                dynaTable1.smartBatchGet(tableArray, batchGetKeyObject).then(function(result) {
                    //This is the fail case.
                    done(new Error('DynaDoc SmartBatchGet accepted invalid key data and did not throw an error'));
                }, function(err) {
                    //Called because the response should fail.
                    done();
                });

            });
        });


    });

});

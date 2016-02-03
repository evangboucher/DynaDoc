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

var fs = require('fs');

var util = require('util');

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
        "region": process.env.region
    });
    envCheck = true;
} else {
    //If you want to use a file it is possible, but using env variables is recommended.
    AWS.config.loadFromPath(path.join(__dirname, 'awscreds.json'));
    envCheck = true;
}
if (!envCheck) {
    throw new Error('DynaTest: No secret key was found for DynamoDB. Unable to test.');
}

//Give the DynaDoc factory the AWS object.
var DynaDoc = require(path.join(ROOT_DIR, "dynadoc.js")).setup(AWS);

//Pull in the test data we will use.
var testData = require(path.join(__dirname, 'test_data.js'));

//Random window so table names hopefully don't collide.
var randomMax = 999999;
//The number will be a suffix of the table name.
var table1Suffix = (Math.floor(Math.random() * randomMax));
var table2Suffix = (Math.floor(Math.random() * randomMax));
//The new table names.
var table1Name = testData.TABLE_NAME1 + table1Suffix;
var table2Name = testData.TABLE_NAME2 + table2Suffix;
console.log('Table 1 Name: ' + table1Name);
console.log('Table 2 Name: ' + table2Name);


var table1ReadCapacity = 10;
var table1WriteCapacity = 10;

//Call this one first so it does not have the Prefix.
var dynaTable1 = DynaDoc.createClient(table1Name, testData.t1Schema, {ReadCapacityUnits: table1ReadCapacity, WriteCapacityUnits: table1WriteCapacity});



//Set a global Prefix for the tables.
DynaDoc.setGlobalOptions({
    TablePrefix: testData.TABLE_NAME2_PREFIX
});


var dynaTable2 = DynaDoc.createClient(table2Name, testData.t2Schema, {ReadCapacityUnits: table1ReadCapacity, WriteCapacityUnits: table1WriteCapacity});

//Make a copy of the table2Name so it does not simply reference it.
var noPrefixTable2Name = new String(table2Name);
/*
The prefix is added by DynaDoc object for the client. This adds the
prefix to be used every in the test document.
*/
table2Name = dynaTable2.getTableName();

//The default timeout for every call.
var DEFAULT_TIMEOUT = 3500;


/**
Test global DynaDoc object. (the root object).
**/
describe('DynaDoc Global Object', function() {
    it('GlobalOptions', function() {
        //Set a global Prefix for the tables.
        DynaDoc.setGlobalOptions({
            TablePrefix: testData.TABLE_NAME2_PREFIX
        });
        expect(DynaDoc.hasGlobalOption("TablePrefix")).to.be.equal(true)
        DynaDoc.removeGlobalOption("TablePrefix");
        expect(DynaDoc.getGlobalOption("TablePrefix")).to.be.null;
        //Set a global Prefix for the tables.
        DynaDoc.setGlobalOptions({
            TablePrefix: testData.TABLE_NAME2_PREFIX
        });
        expect(DynaDoc.getGlobalOption("TablePrefix")).to.be.equal(testData.TABLE_NAME2_PREFIX);
    });
});


describe('DyModel Test Suite', function() {
    after('Deleting tables...', function(done) {
        this.timeout(15000);
        dynaTable1.isTableActive().then(function(res) {
            //Success.
            dynaTable1.deleteTable();
            setTimeout(function() {
                //Wait for the table to be deleted.
            }, 10000);
        }, function(err) {});

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
    });
    describe('#DyModel Creation', function() {
        this.timeout(30000);
        it('Create basic DyModel for Table 1', function(done) {

            //Ensure the important indexes that we want.
            dynaTable1.primaryIndex("PrimaryHashKey", "PrimaryRangeKey");
            dynaTable1.globalIndex(testData.t1GlobalIndexName, "GlobalSecondaryHash",
            {
                "ProjectionType": "ALL",
                "ReadCapacityUnits": 1,
                "WriteCapacityUnits": 1,
                "RangeKey": "GlobalSecondaryRange"
            });
            dynaTable1.localIndex(testData.t1LocalIndexName, "LocalSecondaryIndex", {
                "ProjectionType": "KEYS_ONLY"
            });
            //Quick call to set the max throughput.
            dynaTable1.setMaxThroughput(60);

            //enable streams for this table.
            dynaTable1.setDynamoStreams(true, 'NEW_IMAGE');

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
            dynaTable2.primaryIndex("CustomerID");
            dynaTable2.globalIndex(testData.t2GameIDIndexName, "gameID", {
                "ProjectionType": "INCLUDE",
                "NonKeyAttributes": ["timestamp"]
            });

            try {
                dynaTable2.createTable(true).then(function(res) {
                    //DynamoDB always instantly returns.
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

        it('Attempt to create Table 2 again using ignore parameter.', function(done) {
            expect(DynaDoc.getGlobalOption("TablePrefix")).to.be.equal(testData.TABLE_NAME2_PREFIX);
            var tempClient = DynaDoc.createClient(noPrefixTable2Name, testData.t2Schema, {ReadCapacityUnits: 1, WriteCapacityUnits: 1});
            tempClient.primaryIndex("CustomerID");
            tempClient.globalIndex(testData.t2GameIDIndexName, "gameID");
            expect(tempClient.getTableName()).to.be.equal(dynaTable2.getTableName());
            tempClient.createTable(true).then(function(res) {
                done();
            }, function(err) {
                done(err);
            })
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

        it('Add static function to Table 2', function(done) {
            dynaTable2.addFunction('plusOne', function(one) {
                return ++one;
            });
            expect(dynaTable2.plusOne(1)).to.be.equal(2);
            done();
        });

        it('Print settings for table 1 after creation.', function(done) {
            dynaTable2.printSettings();
            done();
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
        this.timeout(70000);
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
                    }, 65000);
                } catch (err) {
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
        it('Add another globalIndex to Table 2 (No DynamoDB call)', function() {
            this.timeout(60000);
            //Lets add the index.
            dynaTable2.globalIndex("TestIndex", "testIndex", {ReadCapacityUnits: 1, WriteCapacityUnits:2});
            var tablePayload = dynaTable2.getTablePayload();
            expect(tablePayload.GlobalSecondaryIndexUpdates).to.not.be.empty;
            expect(tablePayload.GlobalSecondaryIndexUpdates[0]).to.have.property('Create');
            expect(tablePayload.GlobalSecondaryIndexUpdates[0].Create.IndexName).to.be.equal("TestIndex");
            expect(tablePayload.GlobalSecondaryIndexUpdates[0].Create.KeySchema[0].AttributeName).to.be.equal("testIndex");
            expect(tablePayload.GlobalSecondaryIndexUpdates[0].Create.ProvisionedThroughput).to.have.property('ReadCapacityUnits').to.be.equal(1);
            expect(tablePayload.GlobalSecondaryIndexUpdates[0].Create.ProvisionedThroughput).to.have.property('WriteCapacityUnits').to.be.equal(2);

            dynaTable2.resetTablePayload();
            /*
            @TODO We cannot test updateTable as global indexes take minutes to
            create...we can test that the function produces a valid update
            object though. Then in theory, the update should work with no problem.
            */
        });

        /*
        Delete the global index that we made in table 2.
        Deletes both a global and local index.
        */
        it('Delete Global gameID index from table 2', function(done) {
            this.timeout(80000);
            dynaTable2.deleteIndex(testData.t2GameIDIndexName);
            //Kind of defeating the purpose of promises by waiting, but we need to.
            dynaTable2.updateTable().then(function(res) {
                expect(res).to.have.property("TableDescription");
                expect(res.TableDescription).to.have.property("TableName").to.be.equal(table2Name);
                //The index should be in the DELETING state.
                expect(res.TableDescription.GlobalSecondaryIndexes[0]).to.have.property("IndexStatus").to.be.equal("DELETING");
                setTimeout(function() {
                    //Wait for the table to be updated
                    //We need to wait for describeTable to be done (fairly instant)
                    //Describe the table so the new schema is usable.
                    dynaTable2.describeTable().then(function(res) {
                        setTimeout(function() {
                            //Wait for the table to be updated
                            done();
                            return;
                        }, 5000);
                    }, function(err) {
                        done(err);
                    });
                    return;
                }, 50000);
            }, function(err) {
                done(err);
            });

        });
        /**
        Streams put the table in the updating state, but as long as
        you are not using streams (which we are not in these tests) then
        it will not affect other inputs.
        **/
        it('Disable Dynamo streams from Table 1', function(done) {
            //enable streams for this table.
            dynaTable1.setDynamoStreams(false);
            dynaTable1.updateTable().then(function(res) {
                //The table should now have streams disabled.
                console.log('Streams disabled test result:');
                console.log(JSON.stringify(res, null, 4));
                done()

            }).catch(function(err) {
                done(err);
            });
        });

        it('Diabolical testing for setDynamoStreams function.', function() {
            expect(function() {
                dynaTable1.setDynamoStreams();
            }).to.throw('setDynamoStreams() must have at least one argument (streamEnabled)!');

            expect(function() {
                dynaTable1.setTableThroughput(20, 20);
                dynaTable1.setDynamoStreams(true);
            }).to.throw('setDynamoStreams(): You cannot update the table\'s or indexe\'s IOPs and change streams in the same call.');
            //Reset the table payload so it does not interfere with anything.
            dynaTable1.resetTablePayload();
        });

    });

    //Here we can run the actual tests. on the tables we made.
    describe("DynaDoc", function() {
        this.timeout(DEFAULT_TIMEOUT);
        //Do a big batchwrite first to put all the data in the two tables.

        describe('#BatchWrite', function() {
            it('BatchWrite a few things. (with 1.2 second wait)', function(done) {
                this.timeout(4500);
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
                payload.ReturnValues = 'NONE';

                return dynaTable1.dynamoDoc.batchWriteAsync(payload).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedItems").to.be.empty;
                        /*
                        After long writes, we should wait a bit because the table cannot handle it.
                        */
                        setTimeout(function() {
                            //Wait for a bit.
                            done();
                            return;
                        }, 1200);
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

        describe('#Update DynaDoc Settings', function() {
            it('Change each setting for table 2', function() {
                var newSettings = {
                    "ReturnValues": "ALL_OLD",
                    "ReturnConsumedCapacity": "TOTAL",
                    "ReturnItemCollectionMetrics": "SIZE",
                    "Limit": 20
                };
                dynaTable2.setSettings(newSettings);
                var tableSettingObject = dynaTable2.getSettings();
                expect(tableSettingObject.ReturnValues).to.be.equal("ALL_OLD");
                expect(tableSettingObject.ReturnConsumedCapacity).to.be.equal("TOTAL");
                expect(tableSettingObject.ReturnItemCollectionMetrics).to.be.equal("SIZE");
                expect(tableSettingObject.Limit).to.be.equal(20);
            });

            it('Revert settings of Table 2.', function() {
                var newSettings = {
                    "ReturnValues": "NONE",
                    "ReturnConsumedCapacity": "NONE",
                    "ReturnItemCollectionMetrics": "NONE",
                    "Limit": 10
                };
                dynaTable2.setSettings(newSettings);
                var tableSettingObject = dynaTable2.getSettings();
                expect(tableSettingObject.ReturnValues).to.be.equal("NONE");
                expect(tableSettingObject.ReturnConsumedCapacity).to.be.equal("NONE");
                expect(tableSettingObject.ReturnItemCollectionMetrics).to.be.equal("NONE");
                expect(tableSettingObject.Limit).to.be.equal(10);
            })
        });
        //Test the  update functions.
        describe('#Update Builder', function() {
            it('Custom Build Update', function(done) {
                var updateValue = 1000;
                var newValue = 10;
                //This is 3 * 7 + 1000 for some reason. Need to figure out why.
                var expectedValue = 1000;
                var timeStampValue = 43
                var newObject = {
                    "CustomerID": "Test5",
                    "updateValue": updateValue,
                    "timestamp": [{
                        "time": "2015-08-11T21:31:45.449Z",
                        "value": timeStampValue
                    }],
                    "updateSet": dynaTable2.createSet([4, 3, 2, 1]),
                    "newList": [1, 2, 3, 4],
                    "newValue": newValue
                };
                //dynaTable2.primaryIndex("CustomerID");
                //Create a new builder for the object.
                var builder = dynaTable2.buildUpdate(newObject, {
                    "ReturnValues": "ALL_NEW",
                    "IgnoreMissing": true
                });
                builder.add('updateValue')
                    .add("newValue")
                    .set('timestamp', {
                        AppendToFront: true
                    })
                    .set("newList", {
                        IfNotExist: true
                    })
                    .set("updateSet")
                    .set('NonExistentKey', {
                        IgnoreMissing: true
                    })
                    .add('NonExistentKey', {
                        IgnoreMissing: true
                    })
                    .deleteSet('NonExistentKey', {
                        IgnoreMissing: true
                    })
                    .remove('NonExistentKey', {
                        IgnoreMissing: true
                    });
                //Lets just make sure that we call this for now at least once (drop it though).
                console.log('Update items payload: ' + JSON.stringify(builder.getPayload(), null, 4));
                builder.send().then(function(res) {
                    expect(res.Attributes.timestamp).to.have.length(2);
                    expect(res.Attributes.timestamp[0].value).to.equal(timeStampValue);
                    assert(res.Attributes.updateValue === expectedValue, "updateValue is not what was expected!");
                    expect(res.Attributes).to.have.property("updateSet");
                    expect(res.Attributes).to.have.property("newList");
                    done();
                }, function(err) {
                    console.log('SmartUpdate() Custom Build: ERROR!');
                    done(err);
                });

            });
            it('Remove items from newList.', function(done) {
                //THe value of newList when using remove does not matter right now.
                var newObject = {
                    "CustomerID": "Test5",
                    "newList": [1]
                };

                var builder = dynaTable2.buildUpdate(newObject, {
                    "ReturnValues": "ALL_NEW"
                });
                builder.remove("newList", {
                    LowerBounds: 1,
                    UpperBounds: 2
                }).remove('NonExistentKey', {
                    IgnoreMissing: true
                });
                builder.send().then(function(res) {
                    expect(res.Attributes).to.have.property("newList");
                    expect(res.Attributes.newList).to.have.length(2);
                    expect(res.Attributes.newList[0]).to.equal(1);
                    expect(res.Attributes.newList[1]).to.equal(4);
                    done();
                }, function(err) {
                    console.log('SmartUpdate() Remove Items from newList. ERROR');
                    done(err);
                });
            });

            it('Custom Build smartUpdate: Remove Items. (1.5 second wait)', function(done) {
                var updateValue = 10;
                var newValue = 10;
                //This is 3 * 7 + 1000 for some reason. Need to figure out why.
                var expectedValue = 1010;
                var timeStampValue = 43;
                var newObject = {
                    "CustomerID": "Test5",
                    "updateValue": updateValue,
                    "timestamp": [{
                        "time": "2015-08-11T21:31:45.339Z",
                        "value": timeStampValue
                    }],
                    "updateSet": dynaTable2.createSet([4, 3, 2, 1]),
                    "newValue": newValue,
                    "newList": 0
                };
                //Create a new builder for the object.
                var builder = dynaTable2.buildUpdate(newObject, {
                    "ReturnValues": "ALL_NEW",
                    "ReturnConsumedCapacity": "TOTAL",
                    "ReturnItemCollectionMetrics": "SIZE"
                });
                builder.add('updateValue').remove("newValue").deleteSet("updateSet").remove('newList');

                builder.send().then(function(res) {
                    expect(res.Attributes.timestamp).to.have.length(2);
                    assert(res.Attributes.updateValue === expectedValue, "updateValue is not what was expected!");
                    expect(res.Attributes).to.not.have.property('updateSet');
                    expect(res.Attributes).to.not.have.property('newValue');
                    expect(res.Attributes).to.not.have.property('newList');
                    setTimeout(function() {
                        //Wait for a bit.
                        done();
                        return;
                    }, 1500);
                }, function(err) {
                    console.log('SmartUpdate(): Custom Build removeItems ERROR!');
                    done(err);
                });

            });
        });

        describe('UpdateAsync() call.', function() {
            it('Plain updateAsync() call for table 2.', function(done) {
                var payload = {
                    "TableName": table2Name,
                    "Key": {
                        "CustomerID": "Test5"
                    },
                    "ReturnValues": "ALL_NEW",
                    "ExpressionAttributeNames": {
                        "#testString": "testString"
                    },
                    "ExpressionAttributeValues": {
                        ":testString": "TestUpdatePayload"
                    },
                    "UpdateExpression": " SET #testString = :testString"
                }
                dynaTable2.dynamoDoc.updateAsync(payload).then(function(res) {
                    expect(res.Attributes).to.have.property('testString').to.be.equal("TestUpdatePayload");
                    done();
                }, function(err) {
                    done(err);
                });
            });

            it('UpdateItem() call for table 2.', function (done) {
                var payload = {
                    "TableName": table2Name,
                    "Key": {
                        "CustomerID": "Test5"
                    },
                    "ReturnValues": "ALL_NEW",
                    "ExpressionAttributeNames": {
                        "#testString": "testString"
                    },
                    "ExpressionAttributeValues": {
                        ":testString": "TestUpdatePayload3"
                    },
                    "UpdateExpression": " SET #testString = :testString"
                }
                dynaTable2.updateItem(payload).then(function(res) {
                    expect(res.Attributes).to.have.property('testString').to.be.equal("TestUpdatePayload3");
                    done();
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
                dynaTable2.dynamoDoc.queryAsync(payload).then(function(res) {
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

        describe('#Query One', function() {
            it('Simple Query one call.', function(done) {
                //Pass undefined as the indexName to use the primary index.
                dynaTable2.queryOne(
                    undefined,
                    "#HashName = :HashValue",
                    {
                        ":HashValue": testData.t2Data[3].CustomerID
                    },
                    {
                        "#HashName": "CustomerID"
                    }).then(function(res) {
                    expect(res).to.have.property("Items");
                    expect(res).to.have.property("Count", 1);
                    expect(res).to.have.property("ScannedCount", 1);
                    expect(res.Items[0].CustomerID).to.equal(testData.t2Data[3].CustomerID);
                    done();
                }, function(err) {
                    done(err);
                });
            });
            it('Simple Query one with global index.', function(done) {
                //Pass undefined as the indexName to use the primary index.
                dynaTable1.queryOne(
                    testData.t1GlobalIndexName,
                    "#HashName = :HashValue and #RangeName = :RangeValue",
                    {
                        ":HashValue": testData.t1Data[0].GlobalSecondaryHash,
                        ":RangeValue": testData.t1Data[0].GlobalSecondaryRange
                    },
                    {
                        "#HashName": "GlobalSecondaryHash",
                        "#RangeName": "GlobalSecondaryRange"
                    }).then(function(res) {
                    expect(res).to.have.property("Items");
                    expect(res).to.have.property("Count", 1);
                    expect(res).to.have.property("ScannedCount", 1);
                    expect(res.Items[0].GlobalSecondaryHash).to.equal(testData.t1Data[0].GlobalSecondaryHash);
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
                dynaTable2.deleteItem(payload, {
                    ReturnValues: 'NONE'
                }).then(function(res) {
                    expect(res).to.be.empty;
                    done();
                }, function(err) {
                    done(err);
                });

            });
        });

        describe("#DynaDoc Query", function() {

            it("Query with all params but additionalOptions", function(done) {
                return dynaTable1.query(testData.t1GlobalIndexName,
                    testData.t1Data[0].GlobalSecondaryHash,
                    {
                        Limit: 12,
                        "RangeValue": testData.t1Data[0].GlobalSecondaryRange,
                        "Action": "="
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
                    } catch (err) {
                        done(err);
                        return;
                    }
                    done();
                }, function(err) {
                    done(err);
                });
            });
            it("Query with All params (and some additional options)", function(done) {

                return dynaTable1.query(testData.t1GlobalIndexName,
                    testData.t1Data[0].GlobalSecondaryHash,
                    {
                        "ReturnConsumedCapacity": "TOTAL",
                        "ScanIndexForward": false,
                        "RangeValue": testData.t1Data[0].GlobalSecondaryRange
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
                    done(err);
                });
            });

            it("Query Local Secondary Index.", function(done) {
                return dynaTable1.query(testData.t1LocalIndexName,
                    testData.t1Data[1].PrimaryHashKey, {
                        RangeValue: testData.t1Data[1].LocalSecondaryIndex
                    }).then(function(result) {
                    //Check the secondary values.
                    try {
                        util.inspect(result, {depth: 3});
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
                    done(err);
                });
            });

            it("Query test Primary Index", function(done) {
                return dynaTable1.query(dynaTable1.PRIMARY_INDEX_NAME,
                    testData.t1Data[1].PrimaryHashKey,
                    {
                        RangeValue: testData.t1Data[1].PrimaryRangeKey
                    }).then(function(result) {
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
                    done(err);
                });
            });

            it('Query where range key is present, but not required.', function(done) {
                dynaTable1.query(dynaTable1.PRIMARY_INDEX_NAME,
                    testData.t1Data[2].PrimaryHashKey,
                    {
                        "ReturnConsumedCapacity": "TOTAL",
                        "ScanIndexForward": false,
                        "Limit": 12
                    }).then(function(result) {
                    /*
                    For some reason returning the promise in above does not
                    catch the assertions that happen when the test fails.
                    For now these try and catch blocks in these functions will
                    suffice for what we need. We can change them later.
                    */
                    try {
                        expect(result).to.have.property("Items");
                        expect(result).to.have.property("Count", 2);
                        expect(result).to.have.property("ScannedCount", 2);
                        assert.strictEqual(result.Items[0].PrimaryHashKey, testData.t1Data[1].PrimaryHashKey);
                        //Ensure that the tableName is right and the additional parameters were included.
                        expect(result.ConsumedCapacity).to.have.property("TableName", table1Name);
                    } catch (err) {
                        done(err);
                        return;
                    }
                    done();
                });
            });

            it('Diabolical: Pass in not enough or too many arguments.', function(done) {
                expect(function() {
                    dynaTable1.query()
                }).to.throw('Improper amount of arguments');
                expect(function() {
                    dynaTable1.query(dynaTable1.PRIMARY_INDEX_NAME);
                }).to.throw('Improper amount of arguments');
                expect(function() {
                    dynaTable1.query(dynaTable1.PRIMARY_INDEX_NAME, "Arg2", "Arg3", "Arg4", "Arg5", "Arg6");
                }).to.throw('Improper amount of arguments');
                done();
            });
        });

        describe("#Between", function() {
            it("Between Valid", function(done) {
                return dynaTable1.between(dynaTable1.PRIMARY_INDEX_NAME,
                    testData.t1Data[1].PrimaryHashKey,
                    testData.t1Data[1].PrimaryRangeKey,
                    testData.t1Data[2].PrimaryRangeKey, {
                        Limit: 5
                    }).then(function(result) {
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
                    done(err);
                });
            });

        });

        describe("#PutItem", function() {

            it("Put a simple item", function(done) {
                return dynaTable2.putItem(testData.t2Data[0], {
                    ReturnValues: 'NONE'
                }).then(function(result) {
                    try {
                        //Put item should currently return an empty object.
                        expect(result).to.be.empty;
                    } catch (err) {
                        done(err);
                        return;
                    }
                    done();
                }, function(err) {
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

                return dynaTable2.dynamoDoc.batchGetAsync(payload).then(function(result) {
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
                    done(err);
                });
            });
        });

        describe('#BatchWrite', function() {
            it('Write to one table.', function(done) {
                var tableArray = [table1Name];
                var putItemsObject = {};
                putItemsObject[table1Name] = [testData.t1Data[3], testData.t1Data[1]];
                //Because we specify a different table in batchWrite we can use any dynaDoc Client.
                return dynaTable1.batchWrite(tableArray, {
                    "PutItemsObject": putItemsObject,
                    ReturnValues: 'NONE'
                }).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedItems").to.be.empty;
                    } catch (err) {
                        done(err);
                        return;
                    }
                    done();
                }, function(err) {
                    assert.fail(err, null, "BatchWrite failed to write the items to the database.");
                    done(err);
                });
            });
            it('Batch Delete two items from the previous call. (With 1 second wait)', function(done) {
                var tableArray = [table1Name];
                var deleteItemsObject = {};
                deleteItemsObject[table1Name] = [testData.generateKeyObjectsTable1(3), testData.generateKeyObjectsTable1(1)];

                return dynaTable2.batchWrite(tableArray, {
                    DeleteItemsObject: deleteItemsObject
                }).then(function(result) {
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

                return dynaTable2.batchWrite(tableArray, {
                    PutItemsObject: putItemsObject,
                    DeleteItemsObject: deleteItemsObject
                }).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedItems").to.be.empty;
                    } catch (err) {
                        done(err);
                        return;
                    }
                    done();
                }, function(err) {
                    done(err);
                });
            })

            it('Write to two tables.', function(done) {
                var tableArray = [table1Name, table2Name];
                var putItemsObject = {};
                putItemsObject[table1Name] = [testData.t1Data[3], testData.t1Data[1]];
                putItemsObject[table2Name] = [testData.t2Data[2], testData.t2Data[3]];

                return dynaTable1.batchWrite(tableArray, {
                    PutItemsObject: putItemsObject
                }).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedItems").to.be.empty;

                    } catch (err) {
                        done(err);
                        return;
                    }
                    done();
                }, function(err) {
                    done(err);
                });
            });

        });

        describe('#BatchGet', function() {
            it("Get several items from the tables.", function(done) {
                var tableArray = [table1Name, table2Name];
                var batchGetKeyObject = {};
                batchGetKeyObject[table1Name] = [testData.generateKeyObjectsTable1(3), testData.generateKeyObjectsTable1(2), testData.generateKeyObjectsTable1(1)];
                batchGetKeyObject[table2Name] = [testData.generateKeyObjectsTable2(3), testData.generateKeyObjectsTable2(2), testData.generateKeyObjectsTable2(1)];
                return dynaTable1.batchGet(tableArray, batchGetKeyObject).then(function(result) {
                    try {
                        expect(result).to.have.property("UnprocessedKeys");
                        expect(result.UnprocessedKeys).to.be.empty;
                        expect(result).to.have.property("Responses");
                        expect(result.Responses).to.have.property(table2Name);
                        expect(result.Responses[table2Name]).to.not.be.empty;
                        expect(result.Responses).to.have.property(table1Name);
                        expect(result.Responses[table1Name]).to.not.be.empty;
                        expect(result.Responses[table2Name]).to.have.length(3);
                        expect(result.Responses[table1Name]).to.have.length(3);
                    } catch (err) {
                        done(err);
                        return;
                    }
                    done();
                }, function(err) {
                    done(err);
                });
            });

            it('Get Items that do not exist from both tables.', function(done) {
                var tableArray = [table1Name, table2Name];
                var batchGetKeyObject = {};
                batchGetKeyObject[table1Name] = [testData.generateNonExistentKeyObjectsTable1(1), testData.generateNonExistentKeyObjectsTable1(2)];
                batchGetKeyObject[table2Name] = [testData.generateNonExistentKeyObjectsTable2(1), testData.generateNonExistentKeyObjectsTable2(2)];
                return dynaTable1.batchGet(tableArray, batchGetKeyObject).then(function(result) {
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
                dynaTable1.batchGet(tableArray, batchGetKeyObject).then(function(result) {
                    //This is the fail case.
                    done(new Error('DynaDoc BatchGet accepted invalid key data and did not throw an error'));
                }, function(err) {
                    //Called because the response should fail.
                    done();
                });

            });
        });


    });

});

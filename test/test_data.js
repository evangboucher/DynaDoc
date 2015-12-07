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


Set of test data for mocha tests to use.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

//A set of test data for mocha to use.


var DynaDoc = require("../dynadoc");
var dynaTable3 = DynaDoc.createClient('TableNameExample');
var Joi = DynaDoc.getJoi();
var testData = {};


testData.TABLE_NAME1 = "DynaDocTest1";
testData.TABLE_NAME2 = "DynaDocTest2";

const T1PrimaryHashKeyName = "PrimaryHashKey";
const T1PrimaryRangeKeyName = "PrimaryRangeKey";

const T2PrimaryHashKeyName = "CustomerID";
/*
Currently T2 does not have a range key for the primary index. Left
for expansion later.
*/
const T2PrimaryRangeKeyName = null;

//To create some random integers.
function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

/*
Example data items to use for TABLE_NAME2
*/
testData.t1Data = [{
    "PrimaryHashKey": "PrimaryHashTest1",
    "PrimaryRangeKey": 1,
    "GlobalSecondaryRange": "GlobalRange1",
    "GlobalSecondaryHash": "GlobalHash1",
    "LocalSecondaryIndex": "SecondaryIndex1",
    "score": 90
}, {
    "PrimaryHashKey": "PrimaryHashTest2",
    "PrimaryRangeKey": 100,
    "GlobalSecondaryRange": "GlobalRange2",
    "GlobalSecondaryHash": "GlobalHash2",
    "LocalSecondaryIndex": "SecondaryIndex2",
    "score": 100
}, {
    "PrimaryHashKey": "PrimaryHashTest2",
    "PrimaryRangeKey": 101,
    "GlobalSecondaryRange": "GlobalRange3",
    "GlobalSecondaryHash": "GlobalHash3",
    "LocalSecondaryIndex": "SecondaryIndex3"
}, {
    "PrimaryHashKey": "PrimaryHashTest4",
    "PrimaryRangeKey": 200,
    "GlobalSecondaryRange": "GlobalRange4",
    "GlobalSecondaryHash": "GlobalHash4",
    "LocalSecondaryIndex": "SecondaryIndex4",
    "timestamp": [{
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }]
}];

testData.t1Schema = Joi.object().keys({
    "PrimaryHashKey": Joi.string(),
    "PrimaryRangeKey": Joi.number().integer(),
    "GlobalSecondaryRange": Joi.string(),
    "GlobalSecondaryHash": Joi.string(),
    "LocalSecondaryIndex": Joi.string(),
    "timestamp": Joi.array().items({
        "time": Joi.date(),
        "value": Joi.number().integer()
    }),
    "score": Joi.number().integer().min(0).max(100)
});

testData.t1GlobalIndexName = "GlobalSecondaryTest-index";
testData.t1LocalIndexName = "LocalSecondaryTest-index";
testData.t1ScoreIndexName = "ScoreLocalTest-index";

testData.t2Data = [{
    "CustomerID": "Test2",
    "timestamp": [{
        "time": "2015-08-11T21:31:32.338Z",
        "value": "76"
    }],
    "gameID": 60
}, {
    "CustomerID": "Test3",
    "timestamp": [{
        "time": "2015-08-11T21:41:32.238Z",
        "value": 87
    }]
}, {
    "CustomerID": "Test4",
    "timestamp": [{
        "time": "2015-08-11T21:51:32.328Z",
        "value": 23
    }]
}, {
    "CustomerID": "Test5",
    "timestamp": [{
        "time": "2015-08-11T21:31:45.339Z",
        "value": -100
    }]
}];
testData.t2Data_Fobidden = {
    "CustomerID": "Test5",
    "timestamp": [{
        "time": "2015-08-11T21:31:45.339Z",
        "value": -100
    }],
    "forbidden": 746
};
testData.t2GameIDIndexName = "GameIDCustom-index";

testData.t2Schema = Joi.object().keys({
    "CustomerID": Joi.string(),
    "timestamp": Joi.array().items(Joi.object().keys({
        "time": Joi.string(),
        "value": Joi.number().integer()
    })),
    "forbidden": Joi.any().forbidden(),
    "gameID": Joi.number().integer().min(0),
    "testIndex": Joi.number()
});


/*
Generates the key objects (primary and Range keys) for an object.
This is dynamic so that should the test data change or be added, we
do not have to statically change multiple values in the future.
*/
testData.generateKeyObjectsTable1 = function generateKeyObjectsTable1(index) {
    var keyObject = {};
    keyObject[T1PrimaryHashKeyName] = this.t1Data[index][T1PrimaryHashKeyName];
    if (T1PrimaryRangeKeyName) {
        keyObject[T1PrimaryRangeKeyName] = this.t1Data[index][T1PrimaryRangeKeyName];
    }
    return keyObject;
}
testData.generateKeyObjectsTable2 = function generateKeyObjectsTable2(index) {
    var keyObject = {};
    keyObject[T2PrimaryHashKeyName] = this.t2Data[index][T2PrimaryHashKeyName];
    if (T2PrimaryRangeKeyName) {
        keyObject[T2PrimaryRangeKeyName] = this.t2Data[index][T2PrimaryRangeKeyName];
    }

    return keyObject;
}

/*
Generates valid key objects for keys that should not exist in the tables.
*/
testData.generateNonExistentKeyObjectsTable1 = function generateNonExistentKeyObjectsTable1(index) {
    var keyObject = {};
    keyObject[T1PrimaryHashKeyName] = this.t1Data[index][T1PrimaryHashKeyName] + randomInt(0,2500);
    if (T1PrimaryRangeKeyName) {
        keyObject[T1PrimaryRangeKeyName] = this.t1Data[index][T1PrimaryRangeKeyName] + randomInt(0,2500);
    }

    return keyObject;
}

testData.generateNonExistentKeyObjectsTable2 = function generateNonExistentKeyObjectsTable2(index) {
    var keyObject = {};
    keyObject[T2PrimaryHashKeyName] = this.t2Data[index][T2PrimaryHashKeyName] + randomInt(0,2500);
    if (T2PrimaryRangeKeyName) {
        keyObject[T2PrimaryRangeKeyName] = this.t2Data[index][T2PrimaryRangeKeyName] + randomInt(0,2500);
    }

    return keyObject;
}

module.exports = testData;

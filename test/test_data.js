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

var testData = {};

testData.TABLE_NAME1 = "DynamoTestDelete";
testData.TABLE_NAME2 = "DynamoTest";



/*
Example data items to use for TABLE_NAME2
*/
testData.t1Data = [{
    "PrimaryHashKey": "PrimaryHashTest1",
    "PrimaryRangeKey": 1,
    "GlobalSecondaryRange": "GlobalRange1",
    "GlobalSecondaryHash": "GlobalHash1",
    "LocalSecondaryIndex": "SecondaryIndex1"
}, {
    "PrimaryHashKey": "PrimaryHashTest2",
    "PrimaryRangeKey": 100,
    "GlobalSecondaryRange": "GlobalRange2",
    "GlobalSecondaryHash": "GlobalHash2",
    "LocalSecondaryIndex": "SecondaryIndex2"
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

testData.t2Data = [{
    "CustomerID": "Test2",
    "timestamp": [{
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }]
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

module.exports = testData;

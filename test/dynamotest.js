"use strict"
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

A simple document to utilize and play with DynaDoc while I build it.
This is not in any way official or even useful testing. Strickly development
purposes.

@author: Evan Boucher
@copyright: Mohu Inc.
*/

var TABLE_NAME = "DynamoTest";
//Generator library.
var co = require('co');

//Setup DynamoDB.



//dynamodb-doc
var AWS = require('aws-sdk');
//Example credentials.
//AWS.config.update() //Could be used to hardcode credentials quickly.
/*
THE FOLLOWING EXAMPLE awscreds.json are not real and the values are not valid!
This is intended to be an example only. You will need to create it in your test directory.
{
    "accessKeyId": "djakAKJDiwjskJSAKSHWnSK",
    "secretAccessKey": "maskhakJSlKJHSHFLK/SHJFKLHSKLDJSKHFKLSHfwn",
    "region": "us-east-1"
}
*/
AWS.config.loadFromPath('test/awscreds.json');


var DynoDoc = require('../dynadoc');
//Note: Still need to call DescribeTable(TABLE_NAME) in order to setup the smart features.
var dynaClient = new DynoDoc(AWS, TABLE_NAME + "Delete");

//Will print out the list of tables.
//db.listTable();

var primary_hash = "Test2";

co(function* putItemGenerator() {
    console.log('Testing DynaDoc with co script.');
    //Describe the table.
    var res = yield dynaClient.describeTable();

    console.log('\nUsing Smart query!');
    var smartQuery = yield dynaClient.smartQuery("GlobalSecondary-index", "GlobalHash", "GlobalRange", "=", 12);

    console.log(JSON.stringify(smartQuery, null, 3));

    smartQuery = yield dynaClient.smartQuery("LocalSecondaryIndex-index", "PrimaryHashTest", "SecondaryIndex");

    console.log('\nRepeating Call test...');
    smartQuery = yield dynaClient.smartQuery("LocalSecondaryIndex-index", "PrimaryHashTest", "SecondaryIndex");

    console.log('\nTesting Primary Key with Hash and Range!')
    smartQuery = yield dynaClient.smartQuery(dynaClient.PrimaryIndexName, "PrimaryHashTest", 1);
    console.log(JSON.stringify(smartQuery, null, 3));

    console.log('Testing BETWEEN.');
    try {
        smartQuery = yield dynaClient.smartBetween(dynaClient.PrimaryIndexName, "Test3", 100, 105, 5); //"CustomerID-Date-index"
    } catch (err) {
        console.log(err);
        return;
    }

    console.log('Done getting the between values!');
    console.log(JSON.stringify(smartQuery, null, 4));


    //A table change so we can parse the table (maybe it should save the previous table?)
    var res = yield dynaClient.describeTable(TABLE_NAME);

    dynaClient.setSettings({
        "ReturnValues": "ALL_OLD"
    });
    console.log('Done changing settings for DynaDoc.');

    console.log('Put item is about to be called.')

    try {
        res = yield dynaClient.putItem({
            "CustomerID": "Test2",
            "timestamp": [{
                "time": "2015-08-11T21:31:32.338Z",
                "value": 76
            }]
        });

    } catch (err) {
        console.log('Exception while using DynoDoc.');
        console.log(JSON.stringify(err, null, 3));
    }
    console.log('Put Item is now finished.\n');


    try {
        //Get an item by a global secondary index.
        smartQuery = yield dynaClient.smartQuery("Timestamp-index", "2015-08-11T21:32:34.338Z");
        console.log(JSON.stringify(smartQuery, null, 3));
        console.log('After smart query for timestamp index.');
    } catch (err) {
        console.log('Time-stamp index got an error: ' + err);
    }
    smartQuery = yield dynaClient.smartQuery("PrimaryIndex", "example7");
    console.log(JSON.stringify(smartQuery, null, 3));
    console.log('Smart query returned!');



    console.log('Successfully completed all calls.');
    return res;
});

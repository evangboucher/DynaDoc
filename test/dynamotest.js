"use strict"
/*
A simple document to utilize and play with DynaDoc while I build it.
This is not in any way official or even useful testing. Strickly development
purposes.

@author: Evan Boucher
@copyright: Mohu Inc.
*/
var koa = require('koa');


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


var DynoDoc = require('../DynaDoc');
//Note: Still need to call DescribeTable(TABLE_NAME) in order to setup the smart features.
var dynaDoc = new DynoDoc(AWS, TABLE_NAME);

//Will print out the list of tables.
//db.listTable();

var primary_hash = "Test2";
var data = {
    "CustomerID": "Test2",
    "sensorID": "ca576ad6-90e0-43db-afb3-5fe25bab1c7f",
    "timestamp": [{
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }, {
        "time": "2015-08-11T21:31:32.338Z",
        "value": 76
    }]
};
var example_data = [{
    "Timestamp": "2015-08-11T21:31:32.338Z",
    "CustomerID": "example1"
}, {
    "Timestamp": "2015-08-11T22:31:32.338Z",
    "CustomerID": "example2"
}, {
    "Timestamp": "2015-08-11T21:21:32.338Z",
    "CustomerID": "example3"
}, {
    "Timestamp": "2015-08-11T21:32:32.338Z",
    "CustomerID": "example4"
}, {
    "Timestamp": "2015-08-11T21:32:34.338Z",
    "CustomerID": "example5"
}, {
    "Timestamp": "2015-08-11T21:34:34.338Z",
    "CustomerID": "example6"
}, {
    "Timestamp": "2015-08-11T23:34:34.338Z",
    "CustomerID": "example7"
}, {
    "Timestamp": "2015-08-11T23:44:34.338Z",
    "CustomerID": "example8"
}]

co(function* putItemGenerator() {

    //Describe the table.
    var res = yield dynaDoc.describeTable(TABLE_NAME + "Delete");

    console.log('\nUsing Smart query!');
    var smartQuery = yield dynaDoc.smartQuery("GlobalSecondary-index","GlobalHash", "GlobalRange", "=", 12);

    console.log(JSON.stringify(smartQuery, null, 3));
    smartQuery = yield dynaDoc.smartQuery("LocalSecondaryIndex-index","PrimaryHashTest", "SecondaryIndex");

    console.log('\nREPEATED CALL!!! TESTING SAVED Smart Queries! --------------');
    smartQuery = yield dynaDoc.smartQuery("LocalSecondaryIndex-index","PrimaryHashTest", "SecondaryIndex");

    console.log('\nTesting Primary Key with Hash and Range!!!!')
    smartQuery = yield dynaDoc.smartQuery("PrimaryIndex","PrimaryHashTest", 1);
    //console.log(JSON.stringify(smartQuery, null, 3));
    console.log('DDDOOONNNNEEEE: Testing Primary Key with Hash and Range!!!!\n')

    console.log('Testing BETWEEN.');
    try {
        smartQuery = yield dynaDoc.smartBetween("CustomerID-Date-index","Test1", 0, 1, 5);
    }catch (err) {
        console.log(err);
        return;
    }

    console.log('Done getting the between values!');
    console.log(JSON.stringify(smartQuery, null, 4));


    //A table change so we can parse the table (maybe it should save the previous table?)
    var res = yield dynaDoc.describeTable(TABLE_NAME);

    dynaDoc.setSettings({"ReturnValues":"ALL_OLD"});
    console.log('Done changing settings for DynaDoc.');

    console.log('Put item is about to be called.')

    try {
        res = yield dynaDoc.putItem(data);

    } catch (err) {
        console.log('Exception while using DynoDoc.');
        console.log(JSON.stringify(err, null, 3));
    }
    console.log('Put Item is now finished.\n');


    try {
    //Get an item by a global secondary index.
    smartQuery = yield dynaDoc.smartQuery("Timestamp-index","2015-08-11T21:32:34.338Z");
    console.log(JSON.stringify(smartQuery, null, 3));
    console.log('After smart query for timestamp index.');
} catch(err) {
    console.log('Time-stamp index got an error: ' + err);
}
    smartQuery = yield dynaDoc.smartQuery("PrimaryIndex","example7");
    console.log(JSON.stringify(smartQuery, null, 3));
    console.log('Smart query returned!');

    console.log('Successfully completed all calls.');
    return res;
});

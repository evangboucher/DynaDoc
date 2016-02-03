# DynaDoc #

[![npm version](https://badge.fury.io/js/dynadoc.svg)](https://badge.fury.io/js/dynadoc)     [![Build Status](https://travis-ci.org/evangboucher/DynaDoc.svg?branch=master)](https://travis-ci.org/evangboucher/DynaDoc)  [![Coverage Status](https://coveralls.io/repos/evangboucher/DynaDoc/badge.svg?branch=master&service=github)](https://coveralls.io/github/evangboucher/DynaDoc?branch=master)    [![Join the chat at https://gitter.im/evangboucher/DynaDoc](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/evangboucher/DynaDoc?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)   [![npm downloads](https://img.shields.io/npm/dt/dynadoc.svg)](https://www.npmjs.com/package/dynadoc)

DynaDoc is a smarter DocumentClient for DynamoDB and ORM written in NodeJS.


## Getting started ##

Install the module.
```
npm install dynadoc --save
```

To instantiate it:

```javascript
//Requires the AWS-SDK
var AWS = require('aws-sdk');

/*
Here you may need to include Secrete keys if running outside of EC2.
Otherwise you can assign a DynamoDB role to EC2 instances.

Example Config with keys (These keys are not valid. Replace with your valid keys):

*/
AWS.config.update({
    "accessKeyId": "<YOUR_ACCESS_KEY_ID>",
    "secretAccessKey": "<YOUR_SECRET_ACCESS_KEY>",
    "region": "<YOUR_REGION_OF_CHOICE>"
});

/*
Require the DynaDoc module and initialize it.
You only ever has to call setup(AWS) once. DynaDoc
will hold a reference to the AWS SDK so you can simply
require it in any file you need DynaDoc in after.
setup() is a synchronous call that returns DynaDoc
*/
var DynaDoc = require('dynadoc').setup(AWS);

//If you have multiple tables, you can instantiate multiple DynaDocClients. You must make at least one
var Table1 = DynaDoc.createClient('<DynamoDBTableName>');

/*
Describe Table is meant to be used if you do not use the Dymodel methods.
Creating a schema is the recommended way to use DynaDoc, but this is left
for projects that do not want a schema.

*/
Table1.describeTable('<TABLE_NAME>').then(function(res) {
    console.log('DynaDoc is now ready!');
}).catch(function(err) {
    console.error('Error describing table. DynaDoc will not work.');
    throw err;
});
```

Examples of using DynaDoc:
```javascript
//Using the standard DynamoDB SDK DocumentClient, uses callbacks.
Table1.dynamoDoc.get('<params>', function(err, res) {console.log(JSON.stringify(res, null, 4));});

/*
Using DynaDoc's Promisfied Enpoints.  
*/
Table1.dynamoDoc.getAsync({<Params>}).then(function(res) {console.log('Got response from getAsync().')});

/*
DynaDoc's getItem()KeyObject function.
*/
Table1.getItem({
    "<PrimaryHashKey>": "<PrimaryHashValue>",
    "<PrimaryRangeKey>": "<PrimaryRangeValue>"
}).then(function (err, res) { console.log('Got response from getItem()');});

//Using DynaDoc's smartQuery function. //Only the IndexesName and HashValue are required, other options can be left as undefined
var response = yield Table1.query(
    '<IndexName>',
    '<HashValue>',
    {
        'RangeValue': '<RangeValue>',
        'Action': '>'
        '<AdditionalOptions>':'<Value>'
    }
);


```

### Using DynaDoc's DyModel Feature ###

DynaDoc supports models and schemas! This means that you can specify a specific DynaClient object with a model to represent a table. DynaDoc will then create the DynamoDB table based on that model and will then be able to validate items against that model. Creating models is helpful as it allows for dynamic adjustments for a DynamoDB table. Adjust the throughput, create new indexes, update index throughput, delete indexes, and/or remove old tables to build new ones! DynaDoc will help you do it!

Creating a model is easy!
```javascript
//Assuming the DynaDoc object already exists (with a valid AWS object from above examples)
var DynaDoc = require('dynadoc');
//Get the Joi Validation object.
var Joi = DynaDoc.getJoi();

//Using Joi you can create a schema
testData.t1Schema = Joi.object().keys({
    "PrimaryHashKey": Joi.string(),
    "PrimaryRangeKey": Joi.number().integer(),
    "GlobalSecondaryRange": Joi.string(),
    "GlobalSecondaryHash": Joi.string(),
    "LocalSecondaryIndex": Joi.string(),
    "timestamp": Joi.array().items({
        "time": Joi.date(),
        "value": Joi.number().integer()
    })
});

//This creates a new DynaDoc Client that contains a model (15 and 13 are default table read and write throughput)
var Table1 = DynaDoc.createClient("MyNewTable", testData.t1Schema, {"ReadCapacityUnits": 15, "WriteCapacityUnits": 13});

/*
For any schema, you must specify which key is the primary key and if there is a range key (leave out if no rang key).
*/
Table1.ensurePrimaryIndex("PrimaryHashKey", "PrimaryRangeKey");

/*
This tells DynaDoc that the item GlobalSecondaryHash is a new Global Index.
    Index Hash Name (from schema), Range Name, read, write, IndexName (As it will appear in DynamoDB)
*/
Table1.ensureGlobalIndex("GlobalIndex-index", "GlobalSecondaryHash", "GlobalSecondaryRange", {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5 });

//Create a local index (Always share primary Hash Key):
Table1.ensureLocalIndex("LocalSecondaryIndex", "LocalIndexRange-index");

/*
Create the schema in the table. The param is a boolean to ignore and not create a new table if it already exists.
This is an async call (DynamoDB returns instantly). DynaDoc does not hold a lock or anything. It is currently
your responsibliity to ensure that the table is active (not in the creating state) before making other
calls to the DynamoDB table. DynaDoc provides a isTableActive() method that will return the status of
the table as a boolean (True if active, false otherwise).
*/
Table1.createTable(true); //Returns a promise with response from DynamoDB
```

### What DynaDoc does for you! ###

For example, here is a query call for DynamoDB JavaScript SDK Document Client:

```javascript
//The developer must generate this and pass it into the DyanmoDB DocumentClient as a param.
var payload = {
    "TableName": "DynamoExample",
    "IndexName": "GlobalSecondary-index",
    "KeyConditionExpression": "#HashName = :HashValue and #RangeName >= :RangeValue",
    "ExpressionAttributeValues": {
        ":HashValue": "GlobalHash",
        ":RangeValue": "GlobalRange"
    },
    "ExpressionAttributeNames": {
        "#HashName": "GlobalSecondaryHash",
        "#RangeName": "GlobalSecondaryRange"
    },
    "Limit": 12
};
```

DynaDoc makes one call to the table description and parses all necessary index details for the developer. The above query is automatically generated. The developer can simply pass in the values they want like so:

```javascript
//This generates the previous example dynamically.
//  Index Name, Hash Value
var response = yield Table1.query(
    "GlobalSecondary-index",
    "GlobalHash",
    {
        "RangeValue": "GlobalRange",
        "Action": ">=",
        Limit: 12
    }
);
```


# API Documentation #

Please visit the for API for details: <a href="api.md" target="_blank">DynaDoc API</a>


### How to run tests ###
DynaDoc (will) use Mocha to run and test the library. DynamoDB requires that you have access to the Database to run tests by either running on an approved EC2 instance or having AWS access keys. Currently, we do not have a secure way to give anyone access to run these tests. I am looking for a way to do so and I will happily take suggestions. You should setup your aws testing region in us-east-1, or change the test.

You will need to setup two envrionment variables.
* accessKeyId = "\<Your AWS IAM Access Key\>"
* secretAccessKey = "\<Your AWS IAM Secret key\>"

You could setup your own DynamoDB Tables to test this project. The objects that you will need to create the table for are not located in the "test/" directory under test_data.js. Tests can be run by running:
```
npm test
```


### Who do I talk to? ###

If you have questions, comments, suggestions, and/or concerns you should create an relavent issue or gitter conversation about them.

* Respository Owner/Maintainer: Evan Boucher
* Please open issues if you discover a problem or to request a new feature.
* Contributions are welcomed. Please see <a href="contributing.md" target="_blank">guidelines</a> create a pull request.
* Please use Gitter (badge is at the top of this readme) for communications about DynaDoc

DynaDoc is Open Source and authored by Evan Boucher.

Copyrighted and Sponsored by Mohu Inc. <a href="http://www.gomohu.com" target="_blank">www.gomohu.com</a>


## ToDo List ##
The current list of things that need to be done next.

1. Add smartScan
2. Add ability to cache failed calls due to provision capcity limit and retry with exponential backoff.
3. Validate Batch Write calls
4. Automatically adjust throughput when provision capacity is reached.


### License ###
Released under the terms of the CPAL-1.0 License. CPAL-1.0 is fairly similar to MPL-V2.0, but requires an additional attribution step.

Add the following three lines to your applications UI/somewhere a user can see it. Thats all! Enjoy DynaDoc!

```
DynaDoc powered by Mohu
Copyright(c) 2015 Mohu Inc.
http://www.gomohu.com
```

For a quick summary this site gives a good overview of the license (this is not legal advice!):
<a href="https://tldrlegal.com/license/common-public-attribution-license-version-1.0-(cpal-1.0)#summary" target="_blank">CPAL-1.0</a>

Please read for full license. Do not consider the above sentences legal advice for any reason. Thanks!

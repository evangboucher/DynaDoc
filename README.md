# DynaDoc #

[![npm version](https://badge.fury.io/js/dynadoc.svg)](https://badge.fury.io/js/dynadoc)     [![Build Status](https://travis-ci.org/evangboucher/DynaDoc.svg?branch=master)](https://travis-ci.org/evangboucher/DynaDoc)  [![Coverage Status](https://coveralls.io/repos/evangboucher/DynaDoc/badge.svg?branch=master&service=github)](https://coveralls.io/github/evangboucher/DynaDoc?branch=master)    [![Join the chat at https://gitter.im/evangboucher/DynaDoc](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/evangboucher/DynaDoc?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

NOTICE: DynaDoc is not yet ready for production. Every piece of this project is under heavy development. You should not use this library for production purposes until version 1.0.0 is released. Planned release date is: 12/4/2015

DynaDoc is the smarter DocumentClient for AWS's DynamoDB for NodeJS/JavaScript. DynaDoc is a promise-based DocumentClient API that is able to parse DynamoDB table's description and generates payloads dynamically. DynaDoc builds directly off of the DynamoDB Document Client (simply promising the original DynamoDB DocumentClient API) with some smart parsing features. Normally the DynamoDB requires a fairly large JSON payload with a lot of repetitive data. DynaDoc tries to make it easier and abstract this payload generation away from the developer.

Current Version: 0.2.2

Quick Notes:
1. DynaDoc is dependent on the AWS SDK and requires it through npm install. The AWS-SDK is massive, but if you are using DynamoDB then
it will make sense to have the SDK. Hopefully, we can come up with a way to minimize this dependency.

## Getting started ##

Install the module.
```
npm install dynadoc
```

To instantiate it:

```javascript
//Requires the AWS-SDK
var AWS = require('aws-sdk');

/*
Here you may need to include Secrete keys if running outside of EC2.
Otherwise you can assign a DynamoDB role to EC2 instances.

Example Config with keys (These keys are not valid. Replace with your valid keys):
{
    "accessKeyId": "djakAKJDiwjskJSAKSHWnSK",
    "secretAccessKey": "maskhakJSlKJHSHFLK/SHJFKLHSKLDJSKHFKLSHfwn",
    "region": "us-east-1"
}
*/
AWS.config.update({'region':'<YOUR REGION HERE>'});

//Require the dynadoc module.
var DynaDoc = require('dynadoc')

//If you have multiple tables, you can instantiate multiple DynaDocClients. You must make at least one
var dynaClient = new DynaDoc(AWS, '<DynamoDBTableName>');

//Required in order to use the 'smart' methods of DynaDoc.
dynaClient.describeTable('<TABLE_NAME>'); //Or pass no params to use the <DynamoDBTableName> passed in above
```

Examples of using DynaDoc:
```javascript
//Using the standard DynamoDB SDK DocumentClient, uses callbacks.
dynaClient.dynamoDoc.get('<params>', function(err, res) {console.log(JSON.stringify(res, null, 4));});

//Using DynaDoc's Promisfied Enpoints.  Express Framework
dynaClient.getItem('<PrimaryHashKey>').then(function (err, res) { console.log(JSON.stringify(res, null, 4));});

//Using ES6 Generators
var response = yield dynaClient.getItem('<PrimaryHashKey>');

//Using DynaDoc's smartQuery function. //Only the IndexesName and HashValue are required, other options can be left as undefined
var response = yield dynaClient.smartQuery('<IndexName>', '<HashValue>', '<RangeValue>', '<Action>', '<limit>', {'<AdditionalOptions>':'<Value>'});


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
//                                      Index Name,            Hash Value, Range Value, Action, Limit
var response = yield dynaClient.smartQuery("GlobalSecondary-index","GlobalHash", "GlobalRange",  ">=",  12);
```


# API Documentation #

Please visit the Wiki for API details: <a href="https://github.com/evangboucher/DynaDoc/wiki/API" target="_blank">DynaDoc Wiki</a>



## How do I get set up? ##


### Configuration ###
DynaDoc can be configured by the following methods.

### describeTable('\<TableName\>'); ###

the describeTable method will query the table description and parse the response. The response is parsed into a settings object that contains all the important details about the table and its indexes (names, data types, hash and/range range keys, etc.). This method essentially resets the DynaDoc object to work with the default settings for the given TableName. If TableName is null or undefined, then the table name that the dynaDoc object was created with will be used.

### setSettings({\<SettingsObject\>}); ###

setSettings will allow you to add default values to every payload. Currently the following settings are supported (other settings will be ignored! IE. You cannot add custom settings!):

* ReturnValues: <String> 'NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW'
* ReturnConsumedCapacity: <String> 'INDEXES | TOTAL | NONE'
* ReturnItemCollectionMetrics: <String> 'SIZE | NONE'

### Dependencies ###
* NPM: <a href="https://www.npmjs.com/package/aws-sdk" target="_blank">aws-sdk</a>

### How to run tests ###
DynaDoc (will) use Mocha to run and test the library. DynamoDB requires that you have access to the Database to run tests by either running on an approved EC2 instance or having AWS access keys. Currently, we do not have a secure way to give anyone access to run these tests. I am looking for a way to do so and I will happily take suggestions.

You could setup your own DynamoDB Tables to test this project. The objects that you will need to create the table for are not located in the "test/" directory under test_data.js. Tests can be run by running:
```
npm test
```



### Contribution guidelines ###

* DynaDoc (will) require mocha tests for every pull request and feature added. Your pull request may not be accepted if the tests do not pass or break other tests.
* All pull requests are reviewed and will be merged once approved by the author or repository authorities.
* DynaDoc requires detailed comments and descriptions of functions and lines. You should throughly test functionality and produce the leanest code possible. I am happy to work with you in order to help improve and implement new features and code.

### Who do I talk to? ###

Questions, comments, suggestions, and/or concerns can be sent to Evan Boucher or create an issue in the Issues Tracker here on GitHub.

* Evan Boucher
* Please open issues if you discover a problem or to request a new feature.
* Contributions are welcomed. Please create a pull request.

DynaDoc is Open Source and authored by Evan Boucher.

Copyrighted and Sponsored by Mohu Inc. <a href="http://www.gomohu.com" target="_blank">www.gomohu.com</a>


### Why DynaDoc? ###

DynaDoc was made by a developer who loves AWS and needed the best way to access DynamoDB quickly and effectively. DynaDoc hopes to become that tool!


## ToDo List ##
The current list of things that need to be done next.

1. Enable temporary params into all smart functions (IE. Ability to change query result item order) Currently only SmartQuery has this feature.
1. Add smartUpdate (Big feature)
1. Add smartScan
2. Add ability to cache failed calls due to provision capcity limit and retry with exponential backoff.


### License ###
Released under the terms of the CPAL-1.0 License.

CPAL-1.0 allows you to make changes, use commercially, and distribute DynaDoc with a few requirements. If you modify any file of DynaDoc, you must released the modified files under the CPAL-1.0 license and release the source. If you want to use DynaDoc, we ask that you give credit to Mohu for the use of DynaDoc in your project. This is best done by including the following three lines on/in your product. If your product has a Graphical User Interface of some sort, we ask that you put these three lines somewhere an end user has access to them.

```
DynaDoc powered by Mohu
Copyright(c) 2015 Mohu Inc.
http://www.gomohu.com
```

When possible please make the URL a hyper link.
It is important that with any distribution of DynaDoc you include an unmodified copy of the NOTICE.txt and LICENSE file with the distribution.

This site gives a good overview of the license (this is not legal advice!):
<a href="https://tldrlegal.com/license/common-public-attribution-license-version-1.0-(cpal-1.0)#summary" target="_blank">CPAL-1.0</a>

Please read for full license. The above License section is only meant to help you understand what is expected. Do not consider the above sentences legal advice for any reason. Thanks!

---
Software distributed under the License is distributed on an “AS IS” basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
the specific language governing rights and limitations under the License.

The Original Code is DynaDoc.

The Initial Developer of the Original Code is Evan Boucher.
Copyright (c) 2015 Mohu Inc.  All Rights Reserved.

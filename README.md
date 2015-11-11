# DynaDoc #

NOTICE: DynaDoc is not yet ready for production. You should not use this library until
version 1.0.0 is released. Planned release date is: 12/4/2015

DynaDoc is the smarter DocumentClient for AWS's DynamoDB for NodeJS/JavaScript. DynaDoc is a promise-based DocumentClient API that is able to parse DynamoDB table's description and generates payloads dynamically. DynaDoc builds directly off of the DynamoDB Document Client (simply promising the original DynamoDB DocumentClient API) with some smart parsing features. Normally the DynamoDB requires a fairly large JSON payload with a lot of repetitive data. DynaDoc tries to make it easier and abstract this payload generation away from the developer.

Current Version: 0.0.1

Quick Notes:
1. DynaDoc is dependent on the AWS SDK and requires it through npm install.

## Getting started ##

Install the module.
```
#!javascript

npm install dynadoc
```

To instantiate it:

```
#!javascript

//Requires the AWS-SDK
var AWS = require('aws-sdk');
AWS.config.update({'region':'<YOUR REGION HERE>'});
var DynaDoc = require('dynadoc')(
var dynaClient = new DynaDoc(AWS, '<DynamoDBTableName>');
//Required in order to use the 'smart' methods of DynaDoc.
dynaClient.describeTable('<TABLE_NAME>');
```

Examples of using DynaDoc:
```
#!javascript

//Using the standard DynamoDB SDK DocumentClient, uses callbacks.
dynaClient.dynamoDoc.get('<params>', function(err, res) {console.log(JSON.stringify(res, null, 4));});

//Using DynaDoc's Promisfied Enpoints.  Express Framework
dynaClient.getItem('<PrimaryHashKey>').then(function (err, res) { console.log(JSON.stringify(res, null, 4));});

//Using ES6 Generators
var response = yield dynaClient.getItem('<PrimaryHashKey>');

//Using DynaDoc's smartQuery function.
var response = yield dynaClient.smartQuery('<IndexName>', '<HashValue>', '<RangeValue>', '<Action>', '<limit>');


```

### What DynaDoc does for you! ###

For example, here is a query call for DynamoDB JavaScript SDK Document Client:

```
#!javascript

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

```
#!javascript
//This generates the previous example dynamically.
//                                      Index Name,            Hash Value, Range Value, Action, Limit
var response = yield dynaDoc.smartQuery("GlobalSecondary-index","GlobalHash", "GlobalRange",  ">=",  12);
```


# API Documentation #

More details about specific functions and abilities will be below.

<@TODO Fill in the details about DynaDoc API.>



## How do I get set up? ##


### Configuration ###
DynaDoc can be configured by the following methods.

### describeTable('<TableName>'); ###

the describeTable method will query the table description and parse the response. The response is parsed into a settings object that contains all the important details about the table and its indexes (names, data types, hash and/range range keys, etc.). This method essentially resets the DynaDoc object to work with the default settings for the given TableName.

### setSettings(<SettingsObject>); ###

setSettings will allow you to add default values to every payload. Currently the following settings are supported (other settings will be ignored! IE. You cannot add custom settings!):

* ReturnValues: <String> 'NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW'
* ReturnConsumedCapacity: <String> 'INDEXES | TOTAL | NONE'
* ReturnItemCollectionMetrics: <String> 'SIZE | NONE'

### Dependencies ###
* NPM: [aws-sdk ](Link https://www.npmjs.com/package/aws-sdk)

### How to run tests ###
DynaDoc (will) use Mocha to run and test the library. DynamoDB requires that you have access to the Database to run tests by either running on an approved EC2 instance or having AWS access keys. Currently, we do not have a secure way to give anyone access to run these tests. I am looking for a way to do so and I will happily take suggestions.



### Contribution guidelines ###

* DynaDoc requires mocha tests for every pull request and feature added. Your pull request may not be accepted if the tests do not pass or break other tests.
* All pull requests are reviewed and will be merged once approved by the author or repository authorities.
* DynaDoc requires detailed comments and descriptions of functions and lines. You should throughly test functionality and produce the leanest code possible. I am happy to work with you in order to help improve and implement new features and code.

### Who do I talk to? ###

Questions, comments, suggestions, and/or concerns can be sent to Evan Boucher or create an issue in the Issues Tracker here on Bitbucket.

* Evan Boucher
* Please open issues if you discover a problem or to request a new feature.
* Contributions are welcome. Please create a submit a pull request.

DynaDoc is Open Source and authored by Evan Boucher.

Copyrighted and Sponsored by Mohu Inc. ([www.gomohu.com](Link www.gomohu.com))


### Why DynaDoc? ###

DynaDoc was made by a developer who loves AWS and needed the best way to access DynamoDB quickly and effectively. DynaDoc hopes to become that tool!


## ToDo List ##
The current list of things that need to be done next.
* Current Version: 0.0.1

1. Enable temporary params into smartQuery and smart functions (IE. Ability to change query result item order)
1. Add smartUpdate (Big feature)
1. Add smartScan


### License ###
CPAL-1.0

A short description of what is required will be placed here soon.

"use strict"
/*
A simple document to utilize and play with DynaDoc while I build it.
This is not in any way official or even useful testing. Strickly development
purposes.

@author: Evan Boucher
@copyright: Mohu Inc.
*/
var koa = require('koa');
//The actual koa application.
var app = koa();

var attr = require('dynamodb-data-types').AttributeValue;

var TABLE_NAME = "DynamoTest";
//Generator library.
var co = require('co');
/*
Promise library.
This is the library that will allow us to turn the DynamoDB SDK into
something that we can use generators for.
Another option is to use Bluebird and see if it can convert the
whole SDK into a promisfied version.
*/
var Q = require('q');

//Setup DynamoDB.
/*
 * In production we will use roles on the EC2 instances to give access to the DynamoDB
 instances since that method is much more secure.
 */
var ddb = require('dynamodb').ddb({
    accessKeyId: 'AKIAJOFBH2AP2WB5PC4A',
    secretAccessKey: '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'
});
console.log("Connected to dynamoDB.");

//dynamodb-doc
var AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: 'AKIAJOFBH2AP2WB5PC4A',
    secretAccessKey: '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',
    'region': 'us-east-1'
});
var dbClient = new AWS.DynamoDB();
//Need to set credentials for the aws-sdk.
var docClient = new AWS.DynamoDB.DocumentClient();

var DynoDoc = require('./DynaDoc');
var dynaDoc = new DynoDoc(AWS, TABLE_NAME);

var db = {};
db.listTable = function ListTable() {
    //Here lets call the function to list the dynamoDB table.
    ddb.listTables({}, function(err, res) {
        console.log("The table should be below...");
        console.log(JSON.stringify(res, null, 2));
    });
};
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

var payload = {};
/*
payload.Item = data;
payload.TableName = TABLE_NAME;
payload.ReturnValues = "ALL_OLD";
payload.ReturnConsumedCapacity = "TOTAL";
payload.ReturnItemCollectionMetrics = "SIZE";
docClient.put(payload, function(err, res) {
    if (err) {
        console.log('Error in Put Item response.');
        console.log(err);
        return;
    }
    console.log('PutItem Success. Item is: ');
    console.log(JSON.stringify(res, null, 3));
    console.log('Put Item succeeded!');



})
*

var putItemPromised = Q.denodeify(docClient.put(payload, function(err, res) {
    if (err) {
        console.log('Error in Put Item response.');
        console.log(err);
        putItemCallBack(err, null);
        return;
    }
    console.log('PutItem Success. Item is: ');
    //console.log(JSON.stringify(res, null, 3));
    console.log('Put Item succeeded!');
    //putItemCallBack(null, res);
    //return res;
    return res;
}));
*/

//, putItemCallBack
/*
    Utilizing Q I promified the docClient put method so that
    yield statements will be available in Koa.

    Q may be able to promify the function itself, but this will allow us to
    ensure propery error reporting and custom actions in response to success
    and failures.
*/
function putItem(data) {

    var d = Q.defer();
    payload.Item = data;
    payload.TableName = TABLE_NAME;
    payload.ReturnValues = "ALL_OLD";
    payload.ReturnConsumedCapacity = "TOTAL";
    payload.ReturnItemCollectionMetrics = "SIZE";
    console.log('Before the docClient put call.');
    docClient.put(payload, function(err, res) {
        if (err) {
            console.log('Error in Put Item response.');
            console.log(err);
            d.reject(err);
            return;
        }
        console.log('Put Item succeeded!');
        d.resolve(res);
    });
    console.log('After docClient put call.');
    return d.promise;
}


co(function* putItemGenerator() {
    //Describe the table.
    var res = yield dynaDoc.describeTable(TABLE_NAME);
    var res = yield dynaDoc.describeTable(TABLE_NAME + "Delete");
    /*
    console.log('Put item is about to be called.')
    var res;
    try {
        res = yield dynaDoc.putItem(data);

    } catch (err) {
        console.log('Exception while using DynoDoc.');
        console.log(JSON.stringify(err, null, 3));
    }
    console.log(JSON.stringify(res, null, 3));
    console.log('Put Item is now finished.\n');

    for (var i = 0; i < example_data.length; i++) {

        console.log('Put item is about to be called.')
        res = yield dynaDoc.putItem(example_data[i]);
        console.log(JSON.stringify(res, null, 3));
        console.log('Put Item is now finished.\n');


    }
    console.log('About to call Get Item yield.');
    var get = yield dynaDoc.getItem({
        'CustomerID': primary_hash
    });
    console.log(JSON.stringify(get, null, 3));
    console.log('Get item is now done.\n');
    */

    console.log('About to do a Query on example5 Timestamp index.')
    var query = yield dynaDoc.queryOne("Timestamp-index", "#tkey = :hkey", {":hkey":"2015-08-11T21:32:34.338Z"}, {"#tkey":"Timestamp"});
    console.log(JSON.stringify(query, null, 3));
    console.log('Query item is now done.\n');

    console.log('Using Smart query!');
    var smartQuery = yield dynaDoc.smartQuery("GlobalSecondary-index","TestingHash", "RangeTest", "=");
    console.log('Smart query returned!');
    return res;
});


/*
payload = {};
payload.TableName = TABLE_NAME;
payload.Key = {"CustomerID":key};
payload.ReturnConsumedCapacity = "TOTAL";
payload.ReturnItemCollectionMetrics = "SIZE";
docClient.get(payload, function(err, res) {
    if (err) {
        console.log('Error in Get Item response.');
        console.log(err);
        return err;
    }
    console.log('GetItem Success. Item is: ');
    console.log(JSON.stringify(res, null, 3));
    console.log('Get Item succeeded!');

});
*/

//Attempt to make a generator for the sdk.
function getItem(key) {
    var d = Q.defer();
    payload = {};
    payload.TableName = TABLE_NAME;
    payload.Key = {
        "CustomerID": key
    };
    payload.ReturnConsumedCapacity = "TOTAL";
    payload.ReturnItemCollectionMetrics = "SIZE";
    docClient.get(payload, function(err, res) {
        if (err) {
            console.log('Error in Get Item response.');
            console.log(err);
            d.reject(err);
            return;
        }
        console.log('Get Item succeeded!');
        d.resolve(err);

    });
    return d.promise;
}
co(function* putItemGenerator() {


});

/*
console.log('Testing yield.');
var object = getItem(primary_hash, function(err, res) {
    console.log('Testing the order. This is my syncrounous function. Not data should be after this.');
});
console.log('After Yield statement.');
*/



//attr.wrap(data);

//Now lets add some data to the table.
/*
 Call goes as this Table name, Primary Key (hash & range), attribute values (legacy), values, update action (PUT*, ADD, DELETE),
 callback function.
 Note: DynamoDB does not return anything unless it was a failure (IE. Err is defined).
 You must specify a returnvalue in the parameters if you want a value returned from the DB.
 *
console.log('Making an update to the table... Update data is: ');
console.log('The json data we are updating: ');

var example_data = attr.wrap({'things':'stuff!'});
console.log(JSON.stringify(example_data, null ,2));
ddb.updateItem(TABLE_NAME, primary_hash, null, example_data, {},
               function(err, res, cap) {;
                   if (err) {
                       console.log('FAILED! Update to item failed:');
                       console.log(err);
                   }
                   console.log('Item updated! Response below: ');
                   console.log(JSON.stringify(res, null,2));
                   console.log('Response update above');
               });
console.log('The consumed capacity is: ' + ddb.consumedCapacity());

//Attempt to put an item.
ddb.putItem(TABLE_NAME, data, {},
    function(err, res, cap) {
        if (err) {
            console.log("ERROR putting item.");
            console.log(err);
        }
        console.log('Item was put.');
    });
*
//AN attempt to stress the system (not seeming to test it at all???)
for (var i = 0; i < 1; i++) {
    //Get the same item we just updated.
    ddb.getItem(TABLE_NAME, primary_hash, null, {},
    function(err, res, cap) {
        if (err) {
            console.log("FAILED TO GET ITEM: ");
            console.log(err);
            return;
        }
        console.log("Item is: ");
        console.log(JSON.stringify(res,null,3));
        console.log('Done.');
    });
    console.log('The i value is: ' + i);
}
*/

//Put any Koa middleware above this!!!!!
//We have to give Koa to the Nodejs HTTP module to create the server in order to use Socket.io
// server = require('http').createServer(app.callback());
console.log('Script is done... Reached bottom.');
//Tell the server to listen on port 3000
//if (!module.parent) {
//server.listen(3000);
//} // For just Koa with no Socket.io: app.listen(3000);

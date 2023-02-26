let fs = require('fs');
let {parse} = require('csv-parse');
let async = require('async');
const AWS = require("aws-sdk");
require('dotenv').config()
const {v4: uuidv4} = require('uuid');
AWS.config.update({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY
});
const dynamoDB = new AWS.DynamoDB({apiVersion:'2012-08-10'});
let csv_filename  = process.argv.slice(2)[0];
let wordFamily = '';
console.log("File: ",csv_filename);
rs = fs.createReadStream(csv_filename);
parser = parse({
    columns : true,
    delimiter : ','
}, function(err, data) {
    let split_arrays = [], size = 25;

    while (data.length > 0) {
        let arrayChunk = data.splice(0, size).map(ac => {
            return {id:uuidv4(),...ac}
        });
        split_arrays.push(arrayChunk);
    }
    let data_imported = false;
    let chunk_no = 1;

    async.each(split_arrays, function(itemData, callback) {
        let paramChunk = itemData.map(item => {
            if (wordFamily === '') {
                wordFamily = item['wordFamily']
                addKey(wordFamily);
            }
                return {
                PutRequest: {
                    Item: {
                        "id": {
                            S:item['id']
                        },
                        "wordFamily": {
                            S:item['wordFamily']
                        },
                        "sentence" : {
                            S:item['sentence']
                        }
                    }
                }
            }
        });
        dynamoDB.batchWriteItem({
            RequestItems: {
                "Sentences" : paramChunk
            }
        },function (err,data) {
            if (err) console.log(err,err.stack)
            else console.log("Success");
        });

    }, function() {
        // run after loops
        console.log('all data imported....');

    });

});

const addKey = word => {
    const params = {
        TableName: "Words",
        Item: {
            "wordFamily": {
                S:word
            },
        }
    };
    dynamoDB.putItem(params,function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log("Word added! ",data);           // successful response
    });
}



rs.pipe(parser);
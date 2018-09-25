const MongoClient = require('mongodb').MongoClient;
ObjectID = require('mongodb').ObjectID
const assert = require('assert');
require('isomorphic-fetch');

const url = 'mongodb+srv://ericvu:dhdkmvl5@eric-dev-cluster-zlepn.mongodb.net/fridgedb?retryWrites=true'
const dbName = 'fridgedb'


const expo_api_url = "https://exp.host/--/api/v2/push/send"

const browseExpired = (db, callback) => {
  let categoryresults = db.collection('fridges').aggregate([
    {$unwind: '$contents'}, 
    {$match: {"contents.exp": "2018-09-30"}},
    {$lookup: {from: "users", localField: "contents.owner_id", foreignField: "_id", as: "user_info"}},
    {$group: {_id: "$user_info.device_token", items: {$push: "$contents.name"}}},    
    {$unwind: "$_id"}
    ]).toArray((err, results) => {
    assert.equal(null, err);
    callback(results);
  });
}

MongoClient.connect(url, (err, client) => {
    assert.equal(null, err);
    console.log("Connected successfully to server");

    const db = client.db(dbName);
    let expired = browseExpired(db, (results) => {
      client.close();
      console.log(results);
      
      let messages = [];
      results.map((user) => {
      	const token = user._id;
      	const expired_items = user.items;
      	const num_items = expired_items.length;
      	let body = ""
      	if (num_items > 1) {
      		body = expired_items[0] + " and " + num_items + " other items expiring"
      	}
      	else {
      		body = "Your " + expired_items[0] +" are about to expire!"
      	}
      	const title = "Items Expiring"
      	const message = {
      		to: token,
      		body: body,
      		title: title,
      		badge: 1
      	}
      	messages.push(message);
      })

      fetch(expo_api_url, {
       method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, cors, *same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, same-origin, *omit
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            // "Content-Type": "application/x-www-form-urlencoded",
        },
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        body: JSON.stringify(messages), // body data type must match "Content-Type" header
	    }
	  )
	  .then((res) => {
	    console.log(res)
	  })

    })
  });
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = 'mongodb+srv://datracer:qwer1234@datracercluster-rrswx.mongodb.net/test?retryWrites=true';
const dbName = 'test';

(async function() {
  let client;

  try {
    client = await MongoClient.connect(url);
    console.log("Connected correctly to server");

    const db = client.db(dbName);

    // Insert a single document
    let r = await db.collection('inserts').insertOne({a:1});
    assert.equal(1, r.insertedCount);

    // Insert multiple documents
    r = await db.collection('inserts').insertMany([{a:2}, {a:3}]);
    assert.equal(2, r.insertedCount);
  } catch (err) {
    console.log(err.stack);
  }

  // Close connection
  client.close();
})();


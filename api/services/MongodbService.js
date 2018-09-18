const MongoClient = require('mongodb').MongoClient
const _ = require('lodash')
const EventEmitter = require('events')
const debug = require('debug')('MongodbService')
const ObjectId = require('mongodb').ObjectID;
const Promise = require('bluebird')
const util = require('util')

function allSettled(promises, errValue = null) {
  return Promise.all(promises.map(promise =>
    promise.reflect ? // Check if it's a Native or Bluebird promise
      promise.reflect() :
      Promise.resolve(promise).reflect()))
    .map((inspection) => {
      if (inspection.isFulfilled()) {
        return inspection.value();
      }
      console.error('allSettled', inspection.reason());
      return errValue;
    });
}
class MongodbService extends EventEmitter {
  constructor() {
    super()
    this.changeStreams = []
  }

  objectId(...rest) {
    return ObjectId(rest)
  }

  isConnected() {
    if (this.client) {
      return this.client.isConnected()
    }
    return false;
  }

  async connect(uri = 'mongodb://localhost:27017', databaseName) {
    this.uri = uri
    this.client = await MongoClient.connect(uri, { useNewUrlParser: true })
    debug('debug Connected', this.client.isConnected())
    console.log('Connected')
    this.getDatabase(databaseName)
    return this.client
  }

  async close() {
    if (this.client) {
      return this.client.close()
        .then(() => {
          console.log('Connection closed')
          this.client = null;
          this.db = null;
          return true;
        })
    }
    return true;
  }

  async getDatabase(name) {
    if (this.isConnected()) {
      if (!this.db) {
        debug('keep an instance of the database')
        this.db = this.client.db(name)
      }
      debug('get database', this.db)
      return this.db
    }
    return false
  }

  error(msg) {
    throw new Error(msg)
  }

  async getCollections() {
    if (this.isConnected()) {
      debug('get collections')
      return this.db.collections();
    }
    return []
  }

  // Change Stream
  // http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html
  //
  async subscribeToAll() {
    const collections = await this.getCollections()
    debug('Do we have collections?', collections)
    _.forEach(collections, (collection, key) => {
      try {
        const changeStream = collection.watch()
        console.log('watching', collection.s.namespace)
        changeStream.on('change', (data) => {
          console.log('detected a change', data._id.toString())
          console.log(util.inspect(data, { depth: 10, colors: true, compact: false}))
          this.emit('change', data)
        })
        this.changeStreams.push(changeStream)
      } catch (err) {
        console.log(err.message)
      }
    })
    return []
  }

  async unsubscribeFromAll() {
    console.log('Unsubscribing', this.changeStreams.length)
    const promises = []
    _.forEach(this.changeStreams, (changeStream) => {

      // stop listening to all events from old cursor
      ['data', 'close', 'end', 'error'].forEach(event =>
        changeStream.cursor.removeAllListeners(event)
      );

      // close internal cursor, ignore errors
      changeStream.cursor.close();

      promises.push(changeStream.close())
    });
    return allSettled(promises)
      .then(() => {
        this.changeStreams = []
      })
  }

  async isReplicaSet() {
    if (this.client) {
      const adminDbInstance = this.client.db('admin').admin()
      return adminDbInstance.replSetGetStatus()
    }
    throw new Error('Not connected')
  }

}

module.exports = new MongodbService()

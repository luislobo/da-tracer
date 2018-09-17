const MongoClient = require('mongodb').MongoClient
const _ = require('lodash')
const EventEmitter = require('events')
const debug = require('debug')('MongodbService')
const ObjectId = require('mongodb').ObjectID;

class MongodbService extends EventEmitter {
  constructor() {
    super()
    // boilerplate client instance
    this.client = {
      isConnected() {
        return false
      }
    }
    this.changeStreams = {}
  }

  objectId(...rest) {
    return ObjectId(rest)
  }

  isConnected() {
    return this.client.isConnected()
  }

  async connect(uri = 'mongodb://localhost:27017', databaseName) {
    this.uri = uri
    this.client = await MongoClient.connect(uri, { useNewUrlParser: true })
    debug('debug Connected', this.client.isConnected())
    this.getDatabase(databaseName)
    return this.client
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
      return this.db ? this.db.collections() : error('First connect to the database')
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
      const changeStream = collection.watch()
      changeStream.on('change', (data) => {
        console.log('detected a change', data._id.toString())
        this.emit('change', data)
      })
      this.changeStreams[collection.name] = changeStream
    })
    return []
  }

}

module.exports = new MongodbService()

module.exports = {
  showConnectPage (req, res) {
    res.view('connect', {
      formEndpoint: '/connect'
    })
  },
  connect (req, res) {
    const body = req.body

    // default to body
    let uri = body.uri

    // if database set
    if (body.databaseName) {

      // and if all the other settings are set
      if (body.clusterName && body.user && body.password) {
        // recreate uri
        uri = `mongodb+srv://${encodeURIComponent(body.user)}:${encodeURIComponent(body.password)}@${body.clusterName}/${body.databaseName}?retryWrites=true`
      }

      console.log(uri)
      return MongodbService.connect(uri, body.databaseName)
        .then(() => {
          return MongodbService.isReplicaSet()
            .then((replicaSetStatus) => {
              console.log(`It's a replica set ${replicaSetStatus}`)
              return res.ok()
            })
        })
        .catch(res.serverError)
    }

    return res.badRequest('Missing connection options')
  },
  close (req, res) {
    if (!req.isSocket) {
      res.badRequest('Socket request required')
    }
    sails.sockets.leave(req, 'change-stream')
    MongodbService.removeAllListeners()
    MongodbService.unsubscribeFromAll()
      .then(() => MongodbService.close())
      .then(() => res.ok())
      .catch(res.serverError)
  }
  ,
  showStreamPage (req, res) {
    if (MongodbService.isConnected()) {
      return res.view('stream')
    }
    return res.redirect('/connect')
  }
  ,
  startStream (req, res) {
    if (!MongodbService.isConnected()) {
      res.serverError('Database not connected')
    }
    if (!req.isSocket) {
      res.badRequest('Socket request required')
    }
    sails.sockets.join(req, 'change-stream')
    MongodbService.on('change', (data) => {

      sails.log.verbose('received new change', data)
      const simpleData = {}
      simpleData.timestamp = data.documentKey._id.getTimestamp()
      simpleData.operation = data.operationType
      simpleData._id = data.documentKey._id.toString()
      simpleData.db = data.ns.db
      simpleData.collection = data.ns.coll
      if (simpleData.operation === 'insert') {
        simpleData.document = JSON.stringify(data.fullDocument, null, 2)
      } else if (simpleData.operation === 'update') {
        simpleData.document = data.updateDescription
      }
      sails.log.verbose('broadcasting', simpleData)
      sails.log.info('new change', simpleData._id)
      sails.sockets.broadcast('change-stream', 'message', simpleData)
    })
    MongodbService.subscribeToAll()
      .then(() => {
        res.ok('subscribed')
      })
      .catch(res.serverError)
  }

}

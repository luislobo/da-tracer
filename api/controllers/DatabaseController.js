

module.exports = {
  showConnectPage(req, res) {
    res.view('connect', {
      formEndpoint: '/connect'
    })
  },
  connect(req, res) {
    if (req.body.uri && req.body.databaseName) {
      return MongodbService.connect(req.body.uri, req.body.databaseName)
        .then(() => {
          res.ok()
        })
        .catch((err) => {
          res.serverError(err)
        })
    }
    res.badRequest('Missing connection options')
  },
  showStreamPage(req, res) {
    if (MongodbService.isConnected()) {
      return res.view('stream')
    }
    return res.redirect('/connect')
  },
  startStream(req, res) {
    if (!req.isSocket) {
      res.badRequest('Socket request required')
    }
    sails.sockets.join(req, 'change-stream');
    MongodbService.on('change', (data) => {
      console.log('received new change', data)
      const simpleData = {}
      simpleData.timestamp = data.documentKey._id.getTimestamp()
      simpleData.operation = data.operationType
      simpleData._id = data.documentKey._id.toString()
      simpleData.db = data.ns.db
      simpleData.collection = data.ns.coll
      simpleData.document = JSON.stringify(data.fullDocument, null, 2)
      console.log('broadcasting', simpleData)
      sails.sockets.broadcast('change-stream', 'message', simpleData);
    })
    MongodbService.subscribeToAll()
    res.ok('subscribed')
  },
  stopStream(req, res) {
    if (!req.isSocket) {
      res.badRequest('Socket request required')
    }
    sails.sockets.leave(req, 'change-stream');
    res.ok('unsubscribed')
  }

}

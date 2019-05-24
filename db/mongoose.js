/*
 *  connects to or disconnects from MongoDB
 */

const hide = require('./hide')


module.exports = mongoose => {
    let db, log

    function init(
        _log = {
            info:    () => {},
            warning: () => {},
            error:   () => {}
        }
    ) {
        log = _log
    }

    function connect(conf, cb) {
        let url = 'mongodb://'

        if (conf.user && conf.password) url += `${conf.user}:${conf.password}@`
        if (Array.isArray(conf.replSet)) {
            for (let i = 0; i < conf.replSet.length; i++) {
                url += `${(i > 0)? ',': ''}${conf.replSet[i].host}:${conf.replSet[i].port}`
            }
        } else {
            url += `${conf.host}:${conf.port}`
        }
        url += `/${conf.db}`
        if (conf.replicaSet) url += `?replicaSet=${conf.replicaSet}`

        log.info(`connecting to ${hide(url)}`)

        mongoose.createConnection(url, {
            useMongoClient:    true,
            autoReconnect:     true,
            reconnectInterval: conf.reconnectTime*1000,
            keepAlive:         1,
            socketTimeoutMS:   0
        })
        .on('connected', () => log.info(`connected to ${url}`))
        .on('error', err => {
            log.error(err)
            db && db.close()
        })
        .on('reconnected', () => log.warning(`reconnected to ${url}`))
        .then(_db => {
            db = _db
            cb(null, _db)
        })
        .catch(cb)
    }

    function close() {
        if (!db) return

        log && log.info('closing db connection')
        db.removeAllListeners('connected')
          .removeAllListeners('error')
          .removeAllListeners('reconnected')
          .close()
    }

    return {
        init,
        connect,
        close
    }
}

// mongoose.js

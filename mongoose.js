/*
 *  connects to or disconnects from MongoDB
 */

'use strict'


module.exports = function (mongoose) {
    var db, log

    var init = function (_log) {
        var nop = function () {}

        log = _log || { info: nop, warning: nop, error: nop }
    }

    var connect = function (conf, cb) {
        var url = 'mongodb://'

        if (conf.user && conf.password) url += conf.user+':'+conf.password+'@'
        if (Array.isArray(conf.replSet)) {
            for (var i = 0; i < conf.replSet.length; i++) {
                url += ((i > 0)? ',': '')+conf.replSet[i].host+':'+conf.replSet[i].port
            }
        } else {
            url += conf.host+':'+conf.port
        }
        url += '/'+conf.db
        if (conf.replicaSet) url += '?replicaSet='+conf.replicaSet

        log.info('connecting to '+url)

        mongoose.createConnection(url, {
            useMongoClient:    true,
            autoReconnect:     true,
            reconnectInterval: conf.reconnectTime*1000,
            keepAlive:         1,
            socketTimeoutMS:   0
        })
        .on('connected', function () {
            log.info('connected to '+url)
        })
        .on('error', function (err) {
            log.error(err)
            db && db.close()
        })
        .on('reconnected', function () {
            log.warning('reconnected to '+url)
        })
        .then(function (_db) {
            db = _db
            cb(null, _db)
        })
        .catch(cb)
    }

    var close = function () {
        if (!db) return

        log && log.info('closing db connection')
        db.removeAllListeners('disconnected')
        db.close()
    }


    return {
        init:    init,
        connect: connect,
        close:   close
    }
}

// mongoose.js

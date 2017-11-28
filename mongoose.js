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

    var connect = function (conf) {
        var url = 'mongodb://'

        var reconnect = function () {
            db.open(url, {
                db: { native_parser: true },
                server: {
                    socketOptions:  { keepAlve: 1 },
                    auto_reconnect: true
                },
                replset: {
                    socketOptions: { keepAlive: 1 }
                },
                user: conf.user,
                pass: conf.password
            })
        }

        if (conf.user && conf.password) url += conf.user+':'+conf.password+'@'
        if (Array.isArray(conf.replSet)) {
            for (var i = 0; i < conf.replSet.length; i++) {
                url += ((i > 0)? ',': '')+conf.replSet[i].host+':'+conf.replSet[i].port
            }
        } else {
            url += conf.host+':'+conf.port
        }
        url += '/'+conf.db

        log.info('connecting to '+url)

        db.on('connected', function () {
            log.info('connected to '+url)
        })
        db.on('error', function (err) {
            log.error(err)
            db.close()
        })
        db.on('disconnected', function () {
            log.warning('disconnected from '+url+';'+
                        ' try to reconnect after '+conf.reconnectTime+' sec(s)')
            setTimeout(reconnect, conf.reconnectTime*1000)
        })

        reconnect()
    }

    var close = function () {
        if (!db) return

        log.info('closing db connection')
        db.removeAllListeners('disconnected')
        db.close()
    }

    db = mongoose.createConnection()

    return {
        db:      db,
        init:    init,
        connect: connect,
        close:   close
    }
}

// mongodb.js

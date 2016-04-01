/*
 *  connects to or disconnects from MongoDB
 */

'use strict'

var mongoose = require('mongoose')


var log


function connect(conf) {
    var db = mongoose.connection
    var url = 'mongodb://'

    var reconnect = function () {
        mongoose.connect(url, {
            db: {
                native_parser: true
            },
            server: {
                socketOptions: {
                    keepAlve: 1
                },
                auto_reconnect: true
            },
            replset: {
                socketOptions: {
                    keepAlive: 1
                }
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
        mongoose.disconnect()
    })
    db.on('disconnected', function () {
        log.warning('disconnected from '+url+';'+
                    ' try to reconnect after '+conf.reconnectTime+' sec(s)')
        setTimeout(reconnect, conf.reconnectTime*1000)
    })

    reconnect()
}


function close() {
    log.info('closing db connection')
    mongoose.connection.removeAllListeners('disconnected')
    mongoose.connection.close()
}


module.exports = function (_log) {
    var nop = function () {}
    log = _log || { info: nop, warning: nop, error: nop }

    return {
        connect: connect,
        close:   close
    }
}

// mongodb.js

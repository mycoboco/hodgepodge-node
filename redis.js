/*
 *  connects to or disconnects from Redis
 */

'use strict'

var redis = require('redis'),
    client


var log


function connect(conf, cb) {
    var selectDb = function (err) {
        if (err) {
            cb(err)
            return
        }

        log.info('selecting db #'+conf.db)
        if (conf.db) {
            client.select(conf.db, cb)
            return
        }
        cb(err)
    }

    log.info('connecting to redis('+conf.host+':'+conf.port+')')
    client = redis.createClient(conf.port, conf.host)
    if (conf.auth) {
        log.info('logging into redis with authorization')
        client.auth(conf.auth, selectDb)
    } else {
        selectDb()
    }

    return client
}


function close(cb) {
    if (client) {
        log.info('closing redis connection')
        client.quit(function (err) {
            if (typeof cb === 'function') cb(err)
            else log.error(err)
        })
    }
}


module.exports = function (_log) {
    var nop = function () {}
    log = _log || { info: nop, warning: nop, error: nop }

    return {
        connect: connect,
        close:   close
    }
}

// end of redis.js

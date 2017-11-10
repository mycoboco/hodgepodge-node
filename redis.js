/*
 *  connects to or disconnects from Redis
 */

'use strict'

var redis = require('redis')


module.exports = function () {
    var client, log

    var init = function (_log) {
        var nop = function () {}

        log = _log || { info: nop, warning: nop, error: nop }
    }

    var connect = function (conf, cb) {
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
        client = redis.createClient(conf.port, conf.host, conf.option)
        client.on('error', function (err) {
            log.error(err)
        })
        if (conf.auth) {
            log.info('logging into redis with authorization')
            client.auth(conf.auth, selectDb)
        } else {
            selectDb()
        }

        return client
    }

    var close = function (cb) {
        if (!client) return

        log.info('closing redis connection')
        client.quit(function (err) {
            if (typeof cb === 'function') cb(err)
            else log.error(err)
        })
    }

    return {
        init:    init,
        connect: connect,
        close:   close
    }
}

// end of redis.js

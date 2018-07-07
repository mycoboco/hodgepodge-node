/*
 *  connects to or disconnects from Redis
 */

'use strict'

const redis = require('redis')


module.exports = () => {
    let client, log

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
        function selectDb(err) {
            if (err) {
                cb(err)
                return
            }

            log.info(`selecting db #${conf.db}`)
            if (conf.db) {
                client.select(conf.db, cb)
                return
            }
            cb(err)
        }

        log.info(`connecting to redis(${conf.host}:${conf.port})`)
        client = redis.createClient(conf.port, conf.host, conf.option)
        client.on('error', err => log.error(err))
        if (conf.auth) {
            log.info('logging into redis with authorization')
            client.auth(conf.auth, selectDb)
        } else {
            selectDb()
        }

        return client
    }

    function close(cb) {
        if (!client) return

        log.info('closing redis connection')
        client.quit(err => {
            if (typeof cb === 'function') cb(err)
            else log.error(err)
        })
    }

    return {
        init,
        connect,
        close
    }
}

// end of redis.js

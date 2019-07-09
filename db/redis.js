/*
 *  connects to or disconnects from Redis
 */

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
            if (err) return cb(err)

            log.info(`selecting db #${conf.db}`)
            if (conf.db) return client.select(conf.db, cb)
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

    function close(cb = () => {}) {
        if (!client) return

        log.info('closing redis connection')
        client.quit(err => cb(err))
    }

    return {
        init,
        connect,
        close
    }
}

// end of redis.js

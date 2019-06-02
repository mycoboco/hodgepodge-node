/*
 *  connects to or disconnects from MySQL
 */

const Sequelize = require('sequelize')

const hide = require('./hide')


module.exports = () => {
    let conn, log

    function init(
        _log = {
            info:    () => {},
            warning: () => {},
            error:   () => {}
        }
    ){
        log = _log
    }

    function connect(conf, cb) {
        let url = 'mysql://'

        if (conf.user && conf.password) url += `${conf.user}:${conf.password}@`
        url += `${conf.host}:${conf.port}/${conf.db}`

        log.info(`connecting to ${hide(url)}`)

        conn = new Sequelize(url, {
            query: { raw: true },
            ...conf.option
        })
        conn
            .authenticate()
            .then(() => {
                log.info(`connected to ${hide(url)}`)
                cb(null, conn)
            })
            .catch(err => {
                cb(err)
            })
    }

    function sync(cb) {
        conn.sync()
        .then(() => cb())
        .catch(cb)
    }

    function close(cb = () => {}) {
       if (!conn) return

       log.info('closing mysql connection')
       conn
           .close()
           .catch(err => log.error(err))
    }

    return {
        init,
        connect,
        sync,
        close
    }
}

// mysql.js

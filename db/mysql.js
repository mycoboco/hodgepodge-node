/*
 *  connects to or disconnects from MySQL
 */

const Sequelize = require('sequelize')


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

        log.info(`connecting to ${url}`)

        conn = new Sequelize(url, {
            query: { raw: true }
        })
        conn
            .authenticate()
            .then(() => {
                log.info(`connected to ${url}`)
                conn.sync()
                cb(null, conn)
            })
            .catch(err => {
                cb(err)
            })
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
        close
    }
}

// mysql.js

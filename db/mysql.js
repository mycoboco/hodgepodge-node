/*
 *  connects to or disconnects from MySQL
 */

const Sequelize = require('sequelize');

const hide = require('./hide');

module.exports = () => {
  let conn;
  let log;

  const init = (
    _log = {
      info: () => {},
      warning: () => {},
      error: () => {},
    },
  ) => log = _log;

  const connect = (conf, cb) => {
    let url = 'mysql://';

    if (conf.user && conf.password) url += `${conf.user}:${conf.password}@`;
    url += `${conf.host}:${conf.port}/${conf.db}`;

    log.info(`connecting to ${hide(url)}`);

    conn = new Sequelize(url, {
      query: {raw: true},
      ...conf.option,
    });

    const promise = conn.authenticate()
      .then(() => {
        log.info(`connected to ${hide(url)}`);
        if (cb) return cb(null, conn);
        return conn;
      })
      .catch((err) => {
        log.error(err);
        if (cb) return cb(err);
        throw err;
      });

    if (!cb) return promise;
  };

  const sync = (cb) => {
    const promise = conn.sync();

    if (!cb) return promise;
    promise
      .then(() => cb())
      .catch(cb);
  };

  const close = (cb = () => {}) => {
    if (!conn) return;

    log.info('closing mysql connection');
    conn
      .close()
      .catch((err) => log.error(err));
  };

  return {
    init,
    connect,
    sync,
    close,
  };
};

// eslint-disable-next-line no-constant-condition
if (false) {
  const option = {
    host: '127.0.0.1',
    port: 3306,
    db: 'test',
    user: 'user',
    password: 'password',
  };
  const m = module.exports();
  m.init(console);
  // eslint-disable-next-line no-constant-condition
  if ('promise') {
    m.connect(option)
      .then((conn) => {
        console.log(conn);
        m.close();
      })
      .catch((err) => {
        console.log(err);
        m.close();
      });
  } else {
    m.connect(option, (err, conn) => {
      console.log(err, conn);
      m.close();
    });
  }
}

// mysql.js

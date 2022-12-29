/*
 *  connects to or disconnects from MongoDB
 */

const hide = require('./hide');

module.exports = (mongoose) => {
  let db;
  let log;

  const init = (
    _log = {
      info: () => {},
      warning: () => {},
      error: () => {},
    },
  ) => log = _log;

  const connect = (conf, cb) => {
    let url = 'mongodb://';

    if (conf.user && conf.password) url += `${conf.user}:${conf.password}@`;
    if (Array.isArray(conf.replSet)) {
      url += conf.replSet.map((replSet) => `${replSet.host}:${replSet.port}`).join(',');
    } else {
      url += `${conf.host}:${conf.port}`;
    }
    url += `/${conf.db}`;
    if (conf.replicaSet) url += `?replicaSet=${conf.replicaSet}`;

    log.info(`connecting to ${hide(url)}`);

    // mongoose 6.x does not accept these defaults
    const promise = mongoose.createConnection(url, {
      keepAlive: true,
      socketTimeoutMS: 0,
      ...conf.option,
    })
      .asPromise()
      .then((conn) => {
        log.info(`connected to ${hide(url)}`);
        db = conn;
        if (cb) return cb(null, conn);
        return conn;
      })
      .catch((err) => {
        log.error(err);
        db && db.close();
        if (cb) return cb(err);
        throw err;
      });

    if (!cb) return promise;
  };

  const close = () => {
    if (!db) return;

    log && log.info('closing db connection');
    db.close();
  };

  return {
    init,
    connect,
    close,
  };
};

// eslint-disable-next-line no-constant-condition
if (false) {
  const option = {
    host: '127.0.0.1',
    port: 27017,
    db: 'test',
  };
  const mongoose = require('mongoose');
  const m = module.exports(mongoose);
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

// mongoose.js

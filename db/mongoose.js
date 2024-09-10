/*
 *  connects to or disconnects from MongoDB
 */

import hide from './hide.js';

export default function _(mongoose) {
  let db;
  let log;

  const init = (
    _log = {
      info: () => {},
      warning: () => {},
      error: () => {},
    },
  ) => log = _log;

  const connect = async (conf, cb) => {
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

    try {
      const conn = await mongoose.createConnection(url, {
        socketTimeoutMS: 0,
        ...conf.option,
      }).asPromise();
      log.info(`connected to ${hide(url)}`);
      db = conn;
      return conn;
    } catch (err) {
      log.error(err);
      throw err;
    }
  };

  const close = () => {
    if (!db) return;

    if (log) log.info('closing db connection');
    db.close();
  };

  return {
    init,
    connect,
    close,
  };
}

// eslint-disable-next-line no-constant-condition
if (false) {
  (async () => {
    const option = {
      host: '127.0.0.1',
      port: 27017,
      db: 'test',
    };
    const mongoose = await import('mongoose');
    const m = _(mongoose);
    try {
      m.init(console);
      const conn = await m.connect(option);
      console.log(conn);
    } catch (err) {
      console.log(err);
    } finally {
      m.close();
    }
  })();
}

// mongoose.js

/*
 *  connects to or disconnects from Redis
 */

const redis = require('redis');

module.exports = () => {
  let client;
  let log;

  const init = (
    _log = {
      info: () => {},
      warning: () => {},
      error: () => {},
    },
  ) => log = _log;

  const connect = (conf, cb) => {
    // for backward compatibility
    if (conf.db) {
      conf.database = conf.db;
      delete conf.db;
    }
    if (conf.auth) {
      conf.password = conf.auth;
      delete conf.auth;
    }

    log.info(`connecting to redis(${conf.host}:${conf.port})`);
    client = redis.createClient(conf.port, conf.host, conf.option);
    client.on('error', (err) => log.error(err));
    const promise = client.connect()
      .then(() => {
        log.info(`connected to redis(${conf.host}:${conf.port})`);
        if (cb) return cb(null, client);
        return client;
      })
      .catch((err) => {
        log.error(err);
        db && db.close();
        if (cb) return cb(err);
        throw err;
      });

    if (!cb) return promise;
  };

  const close = async (cb) => {
    if (!client) return;

    log.info('closing redis connection');
    try {
      await client.quit();
    } catch (_err) {
      // ignore
    }
    if (cb) cb();
  };

  return {
    init,
    connect,
    close,
  };
};

// eslint-disable-next-line no-constant-condition
if (true) {
  const option = {
    host: '127.0.0.1',
    port: 6379,
    db: 0,
  };
  const r = module.exports();
  r.init(console);
  // eslint-disable-next-line no-constant-condition
  if ('promise') {
    r.connect(option)
      .then((client) => {
        console.log(client);
        r.close();
      })
      .catch((err) => {
        console.log(err);
        r.close();
      });
  } else {
    r.connect(option, (err, client) => {
      console.log(err, client);
      r.close();
    });
  }
}

// end of redis.js

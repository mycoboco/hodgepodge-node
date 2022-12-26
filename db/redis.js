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

  const connect = (conf) => {
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

    return client;
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
if (false) {
  const r = module.exports();
  r.init(console);
  const client = r.connect({
    host: 'localhost',
    port: 6379,
    db: 0,
  });
  console.log(client);
  // eslint-disable-next-line no-constant-condition
  if ('promise') {
    r.close()
      .then(() => console.log('closed'));
  } else {
    r.close(() => console.log('closed'));
  }
}

// end of redis.js

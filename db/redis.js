/*
 *  connects to or disconnects from Redis
 */

const redis = require('redis');

const hide = require('./hide');

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
    let url = 'redis://';

    if (conf.user) url += conf.user;
    if (conf.auth || conf.password) url += `:${conf.auth || conf.password}`;
    if (conf.user || conf.auth || conf.password) url += '@';
    url += `${conf.host}:${conf.port}/${conf.db}`;

    log.info(`connecting to ${hide(url)}`);
    client = redis.createClient({
      url,
      ...conf.option,
    });
    client.on('error', (err) => log.error(err));
    const promise = client.connect()
      .then(() => {
        log.info(`connected to redis(${conf.host}:${conf.port})`);
        if (cb) return cb(null, client);
        return client;
      })
      .catch((err) => {
        log.error(err);
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
if (false) {
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

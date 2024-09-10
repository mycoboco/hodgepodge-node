/*
 *  connects to or disconnects from Redis
 */

import {createClient} from 'redis';

import hide from './hide.js';

export default function _() {
  let client;
  let log;

  const init = (
    _log = {
      info: () => {},
      warning: () => {},
      error: () => {},
    },
  ) => log = _log;

  const connect = async (conf) => {
    let url = 'redis://';

    if (conf.user) url += conf.user;
    if (conf.auth || conf.password) url += `:${conf.auth || conf.password}`;
    if (conf.user || conf.auth || conf.password) url += '@';
    url += `${conf.host}:${conf.port}/${conf.db}`;

    log.info(`connecting to ${hide(url)}`);
    try {
      client = await createClient({
        url,
        ...conf.option,
      })
        .on('error', (err) => log.error(err))
        .connect();
    } catch (err) {
      log.error(err);
      throw err;
    }

    log.info(`connected to redis(${conf.host}:${conf.port})`);
    return client;
  };

  const close = async () => {
    if (!client) return;

    log.info('closing redis connection');
    try {
      await client.quit();
    } catch (_err) {
      // ignore
    }
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
      port: 6379,
      db: 0,
    };
    const redis = _();
    redis.init(console);
    try {
      const client = await redis.connect(option);
      console.log(client);
    } catch (err) {
      console.log(err);
    } finally {
      redis.close();
    }
  })();
}

// end of redis.js

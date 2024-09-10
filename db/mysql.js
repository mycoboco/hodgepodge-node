/*
 *  connects to or disconnects from MySQL
 */

import Sequelize from 'sequelize';

import hide from './hide.js';

export default function _() {
  let conn;
  let log;

  const init = (
    _log = {
      info: () => {},
      warning: () => {},
      error: () => {},
    },
  ) => log = _log;

  const connect = async (conf) => {
    let url = 'mysql://';

    if (conf.user && conf.password) url += `${conf.user}:${conf.password}@`;
    url += `${conf.host}:${conf.port}/${conf.db}`;

    log.info(`connecting to ${hide(url)}`);

    conn = new Sequelize(url, {
      query: {raw: true},
      ...conf.option,
    });

    try {
      await conn.authenticate();
    } catch (err) {
      log.error(err);
      throw err;
    }
    log.info(`connected to ${hide(url)}`);
    return conn;
  };

  const sync = async () => conn.sync();

  const close = () => {
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
}

// eslint-disable-next-line no-constant-condition
if (false) {
  (async () => {
    const option = {
      host: '127.0.0.1',
      port: 3306,
      db: 'test',
      user: 'user',
      password: 'password',
    };
    const m = _();
    m.init(console);
    try {
      const conn = await m.connect(option);
      console.log(conn);
    } catch (err) {
      console.log(err);
    } finally {
      m.close();
    }
  })();
}

// mysql.js

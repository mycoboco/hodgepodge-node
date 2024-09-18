/*
 *  minifies and servers js
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {minify} from 'minify';

let pub;
let log;

export function serve(
  _pub = 'public',
  _log = {
    info: () => {},
    warning: () => {},
    error: () => {},
  },
) {
  pub = _pub;
  log = _log;

  return async (req, res) => {
    const dir = path.dirname(req.url);
    const name = path.basename(req.url).substring(1); // foo.js from _foo.js

    try {
      const result = await minify(path.join(pub, dir, `+${name}`));
      res.header('Content-type', 'text/javascript')
        .send(result);
      await fs.writeFile(path.join(pub, req.url), result);
    } catch (err) {
      log.error(err);
    }
  };
}

export function filter(req, res, next) {
  if (/(?:.*\/|^)\+[^/]+\.js$/.test(req.path)) { // blocks +foo.js
    return res.sendStatus(404);
  }
  next();
}

// eslint-disable-next-line no-constant-condition
if (!false) {
  const res = {
    header: (k, v) => {
      console.log(k, v);
      return {
        send: (d) => console.log(d),
      };
    },
  };

  serve('test', console)({url: '_foo.js'}, res);
  filter({path: 'test/+foo.js'}, {sendStatus: (c) => console.log(c)});
}

// end of minjs.js

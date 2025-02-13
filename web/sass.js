/*
 *  compiles and servers scss
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as sass from 'sass';

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

  return (req, res, next) => {
    const dir = path.dirname(req.url);
    const name = path.basename(req.url, path.extname(req.url)).substring(1); // foo from _foo.css

    try {
      const {css} = sass.compile(
        path.join(pub, dir, `+${name}.scss`),
        {style: 'compressed'},
      );
      res.header('Content-type', 'text/css')
        .send(css);
      fs.writeFile(path.join(pub, req.url), css)
        .catch((err) => log.error(err));
    } catch (err) {
      log.error(err);
      return next();
    }
  };
}

export function filter(req, res, next) {
  if (/(?:.*\/|^)\+[^/]+\.scss$/.test(req.path)) { // blocks +foo.scss
    return res.sendStatus(404);
  }
  next();
}

// eslint-disable-next-line no-constant-condition
if (false) {
  const res = {
    header: (k, v) => {
      console.log(k, v);
      return {
        send: (d) => console.log(d.toString('utf8')),
      };
    },
  };

  serve('test', console)({url: '_foo.css'}, res);
  filter({path: 'test/+foo.scss'}, {sendStatus: (c) => console.log(c)});
}

// end of sass.js

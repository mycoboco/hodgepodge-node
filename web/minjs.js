/*
 *  minifies and servers js
 */

const fs = require('fs/promises');
const path = require('path');

const minify = require('minify');

let pub;
let log;

function serve(
  _pub = 'public',
  _log = {
    info: () => {},
    warning: () => {},
    error: () => {},
  },
) {
  pub = _pub;
  log = _log;

  return async (req, res, _next) => {
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

function filter(req, res, next) {
  if (/(?:.*\/|^)\+[^/]+\.js$/.test(req.path)) { // blocks +foo.js
    return res.sendStatus(404);
  }
  next();
}

module.exports = {
  serve,
  filter,
};

// eslint-disable-next-line no-constant-condition
if (false) {
  const m = module.exports;
  const res = {
    header: (k, v) => {
      console.log(k, v);
      return {
        send: (d) => console.log(d),
      };
    },
  };

  m.serve('test', console)({url: '_foo.js'}, res);
  m.filter({path: 'test/+foo.js'}, {sendStatus: (c) => console.log(c)});
}

// end of minjs.js

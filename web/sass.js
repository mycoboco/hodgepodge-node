/*
 *  compiles and servers scss
 */

const fs = require('fs');
const path = require('path');

const sass = require('node-sass');

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

  return (req, res, next) => {
    const dir = path.dirname(req.url);
    const name = path.basename(req.url, path.extname(req.url)).substring(1); // foo from _foo.css

    sass.render({
      file: path.join(pub, dir, `+${name}.scss`),
      outputStyle: 'compressed',
    }, (err, result) => {
      if (err) {
        log.error(err);
        return next();
      }
      res.header('Content-type', 'text/css')
        .send(result.css);
      fs.writeFile(path.join(pub, req.url), result.css, (err) => log.error(err));
    });
  };
}

function filter(req, res, next) {
  if (/(?:.*\/|^)\+[^/]+\.scss$/.test(req.path)) { // blocks +foo.scss
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
  const s = module.exports;
  const res = {
    header: (k, v) => {
      console.log(k, v);
      return {
        send: (d) => console.log(d.toString('utf8')),
      };
    },
  };

  s.serve('test', console)({url: '_foo.css'}, res);
  s.filter({path: 'test/+foo.scss'}, {sendStatus: (c) => console.log(c)});
}

// end of sass.js

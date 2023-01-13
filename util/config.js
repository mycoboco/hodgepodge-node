/*
 *  konphyg wrapper
 */

const path = require('path');

const konfig = require('konphyg');

function traverse(obj, key, decrypt) {
  const cur = obj[key];

  if (cur !== null && typeof cur === 'object') {
    Object.keys(cur).forEach((k) => {
      traverse(cur, k, decrypt);
    });
  } else if (typeof cur === 'string') {
    const variable = /^\${?([A-Z_]+)}?/.exec(cur);
    if (variable) {
      let val = process.env[variable[1]];
      if (typeof decrypt === 'function' && cur[1] === '{') val = decrypt(val);
      obj[key] = val;
    }
  }
}

module.exports = (p = 'config', _conf, opt) => {
  const conf = {};
  const config = konfig(p);

  Object.keys(_conf).forEach((p) => {
    const sep = p.indexOf(':');
    const key = sep >= 0 ? p.substring(sep + 1) : p;

    conf[key] = {
      ..._conf[p],
      ...config(path.join(p.substring(0, sep), key)),
    };
  });

  if (opt && opt.supportEnv) traverse({conf}, 'conf', opt.decrypt);

  return conf;
};

// eslint-disable-next-line no-constant-condition
if (true) {
  const c = module.exports;
  console.log(c(path.join('.', 'test'), {
    'foo': {
      'param': 1,
    },
    'sub:bar': {
      'param': 2,
    },
    'none': {
      'default': 3,
    },
    'env': {
      'path': '$PATH',
      'lang': '$LANG',
      'home': '${HOME}',
      'user': '${USER}',
    },
  }, {
    supportEnv: true,
    decrypt: (text) => (console.log(`decrypt ${text}`), text),
  }));
}

// end of config.js

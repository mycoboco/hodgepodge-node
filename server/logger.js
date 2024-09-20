/*
 *  logger wrapper for winston
 */

import {inspect} from 'node:util';
import {
  dirname,
  basename,
  sep,
  join,
} from 'node:path';
import {fileURLToPath} from 'node:url';

// eslint-disable-next-line no-unused-vars
import colors from 'colors';
import winston from 'winston';
import {format} from 'logform';

const SPLAT = Symbol.for('splat');

const removePrefix = (() => {
  const cs = dirname(fileURLToPath(import.meta.url)).split(sep);

  return (u) => {
    u = fileURLToPath(u);
    const d = dirname(u);
    const f = basename(u);
    const ds = dirname(u).split(sep);

    let i;
    for (i = 0; i < Math.min(cs.length, ds.length); i++) {
      if (cs[i] !== ds[i]) break;
    }

    return join(d.substring(cs.slice(0, i).join('/').length), f);
  };
})();

function getter() {
  const orig = Error.prepareStackTrace;
  const err = new Error;

  Error.prepareStackTrace = (_, stack) => stack;
  Error.captureStackTrace(err, getter);
  const {stack} = err;
  Error.prepareStackTrace = orig;

  return stack;
}

// adds global property to trace call stacks
!Object.prototype.hasOwnProperty.call(global, '__stack') &&
  Object.defineProperty(global, '__stack', {
    get: getter,
  });

// adds global property to get line number
!Object.prototype.hasOwnProperty.call(global, '__line') && Object.defineProperty(global, '__line', {
  get() {
    return global.__stack[2].getLineNumber();
  },
});


// adds global property to get function name
!Object.prototype.hasOwnProperty.call(global, '__function') &&
  Object.defineProperty(global, '__function', {
    get() {
      return global.__stack[2].getFunctionName();
    },
  });

// adds global property to get file name
!Object.prototype.hasOwnProperty.call(global, '__file') && Object.defineProperty(global, '__file', {
  get() {
    return removePrefix(global.__stack[2].getFileName());
  },
});

// ?conf = {
//     prefix: 'prefix',
//     level:  'info' || 'warn' || 'error' || 'off',
//     stack:  true || false
// }
export function create(conf) {
  conf = {
    prefix: undefined,
    level: 'info',
    stderrLevel: '',
    stack: true,
    ...conf,
  };

  const colorize = conf.level !== 'off' && process.stdout.isTTY && !conf.json;
  const stderrLevels = [];
  if (conf.stderrLevel) {
    stderrLevels.push('error');
    if (conf.stderrLevel !== 'error') {
      stderrLevels.push('warn');
      if (!conf.stderrLevel.startsWith('warn')) stderrLevels.push('info');
    }
  }

  const locus = winston.format((info) => {
    // additional field
    [info.locus] = info[SPLAT];
    return info;
  });

  const stringify = winston.format((info) => {
    Object.keys(info).forEach((key) => {
      if (typeof info[key] === 'object') {
        info[key] = inspect(info[key]);
      }
    });
    return info;
  });

  const meta = winston.format((info) => {
    let meta = (info[SPLAT][1] || [])
      .map((m) => {
        if (typeof m === 'object') return inspect(m);
        return m;
      })
      .join(', ');
    if (colorize && meta) meta = meta.gray;

    if (conf.stack && typeof info.message === 'object' && info.message.message) {
      info.message.message = `${info.message.message}${meta ? ': ' : ''}${meta}`;
    } else {
      info.message = `${info.message}${meta ? ': ' : ''}${meta}`;
    }
    return info;
  });

  const label = winston.format((info) => {
    info.label = conf.prefix;
    return info;
  });

  const logger = winston.createLogger({
    levels: {
      error: 0,
      warn: 1,
      warning: 1,
      info: 2,
    },
    exitOnError: false,
    silent: conf.level === 'off',
    transports: [
      new winston.transports.Console({
        level: conf.level,
        stderrLevels,
        format: format.combine(
          format.timestamp(),
          label(),
          locus(),
          meta(),
          stringify(),
          ...(colorize ? [format.colorize({
            colors: {
              error: 'red',
              warn: 'yellow',
              warning: 'yellow',
              info: 'green',
            },
          })] : []),
          conf.json ?
            format.json() :
            format.printf((info) => {
              let label = ` [${info.label}]`;
              let locus = `<${info.locus}>`;
              if (colorize) {
                label = label.blue;
                locus = locus.cyan;
              }
              return `${info.timestamp} - ${info.level}:${info.label ? label : ''} ` +
                `${info.message} ${locus}`;
            }),
        ),
      }),
    ],
  });

  ['error', 'warn', 'warning', 'info', 'http', 'verbose', 'debug', 'silly'].forEach((level) => {
    const original = logger[level];
    logger[level] = (msg, ...rest) => {
      original.call(
        logger,
        msg,
        `${global.__file}:${global.__line}${global.__function ? ` (${global.__function})` : ''}`,
        rest,
      );
    };
  });

  return logger;
}

// eslint-disable-next-line no-constant-condition
if (false) {
  !(function test() {
    const log1 = create({
      prefix: 'test',
      level: 'info',
      stderrLevel: 'warning',
      json: true,
      stack: true,
    });
    const log2 = create({
      // no prefix
      level: 'info',
      // no stderrLevel
      json: false,
      stack: true,
    });
    const log3 = create({
      prefix: 'no-info',
      level: 'warn',
      stderrLevel: 'error',
      json: false,
      stack: false,
    });
    const log4 = create({
      prefix: 'all-to-stderr',
      // no level,
      stderrLevel: 'info',
      json: false,
      stack: false,
    });

    log1.info('information message', {foo: 'bar'}, 2);
    log1.warn('warning message', ['foo', 'bar'], 'second', undefined);
    log1.error(new Error('error message'), {nested: {foo: 'bar'}}, null);

    console.log('');
    log2.info('information message');
    log2.warning('warning message');
    log2.error(new Error('error message'));

    console.log('');
    log3.info('information message', {foo: 'bar'}, 2);
    log3.warn('warning message', ['foo', 'bar'], 'second', undefined);
    log3.error(new Error('error message'), {nested: {foo: 'bar'}}, null);

    console.log('');
    log4.info('information message', {foo: 'bar'}, 2);
    log4.warn('warning message', ['foo', 'bar'], 'second', undefined);
    log4.error(new Error('error message'), {nested: {foo: 'bar'}}, null);
  })();
}

// end of logger.js

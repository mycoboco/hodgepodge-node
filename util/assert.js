/*
 *  assetions to check types
 */

function Type(name, xtra) {
  this.name = name;
  if (xtra) {
    if (xtra.optional) this.OPTIONAL = new Type(`${name}.OPTIONAL`);
    if (xtra.nullable) this.NULLABLE = new Type(`${name}.NULLABLE`);
    if (xtra.optional && xtra.nullable) {
      this.NULLABLE.OPTIONAL = this.OPTIONAL.NULLABLE = new Type(`${name}.OPTIONAL.NULLABLE`);
    }
    if (xtra.nonempty) this.NONEMPTY = new Type(`${name}.NONEMPTY`);
  }
}

const TYPES = {
  STRING: new Type('STRING', {
    optional: true, nonempty: true, nullable: true,
  }),
  NUMBER: new Type('NUMBER', {
    optional: true, nullable: true,
  }),
  INTEGER: new Type('INTEGER', {
    optional: true, nullable: true,
  }),
  BOOLEAN: new Type('BOOLEAN', {
    optional: true, nullable: true,
  }),
  ARRAY: new Type('ARRAY', {
    optional: true, nonempty: true, nullable: true,
  }),
  OBJECT: new Type('OBJECT', {
    optional: true, nonempty: true, nullable: true,
  }),
  NOTEXISTS: new Type('NOTEXISTS'),
};

function isString(target) {
  return typeof target === 'string';
}

function isNonEmptyString(target) {
  return !!(isString(target) && target);
}

function isRegExp(target) {
  return target instanceof RegExp;
}

function isNumber(target) {
  return !!(typeof target === 'number' && isFinite(target));
}

function isNaNNumber(target) {
  return !!(typeof target === 'number' && isNaN(target));
}

function isInteger(target) {
  return isNumber(target) && Math.floor(target) === target &&
    Math.abs(target) <= Number.MAX_SAFE_INTEGER;
}

function isBoolean(target) {
  return typeof target === 'boolean';
}

function isArray(target) {
  return Array.isArray(target);
}

function isNonEmptyArray(target) {
  return isArray(target) && target.length > 0;
}

function isObject(target) {
  return !!(target && target.constructor === Object); // array excluded
}

function isNonEmptyObject(target) {
  return isObject(target) && Object.keys(target).length > 0;
}

function like(target, ...specs) {
  const {
    STRING, NUMBER, INTEGER, BOOLEAN, ARRAY, OBJECT, NOTEXISTS,
  } = TYPES;

  return specs.some((spec) => {
    switch (spec) {
      case STRING:
        return isString(target);
      case STRING.OPTIONAL:
        if (target === undefined) return true;
        return isString(target);
      case STRING.OPTIONAL.NULLABLE:
        if (target === undefined || target === null) return true;
        return isString(target);
      case STRING.NONEMPTY:
        return isNonEmptyString(target);
      case STRING.NULLABLE:
        if (target === null) return true;
        return isString(target);

      case NUMBER:
        return isNumber(target);
      case NUMBER.OPTIONAL:
        if (target === undefined) return true;
        return isNumber(target);
      case NUMBER.OPTIONAL.NULLABLE:
        if (target === undefined || target === null) return true;
        return isNumber(target);
      case NUMBER.NULLABLE:
        if (target === null) return true;
        return isNumber(target);

      case INTEGER:
        return isInteger(target);
      case INTEGER.OPTIONAL:
        if (target === undefined) return true;
        return isInteger(target);
      case INTEGER.OPTIONAL.NULLABLE:
        if (target === undefined || target === null) return true;
        return isInteger(target);
      case INTEGER.NULLABLE:
        if (target === null) return true;
        return isInteger(target);

      case BOOLEAN:
        return isBoolean(target);
      case BOOLEAN.OPTIONAL:
        if (target === undefined) return true;
        return isBoolean(target);
      case BOOLEAN.OPTIONAL.NULLABLE:
        if (target === undefined || target === null) return true;
        return isBoolean(target);
      case BOOLEAN.NULLABLE:
        if (target === null) return true;
        return isBoolean(target);

      case ARRAY:
        return isArray(target);
      case ARRAY.OPTIONAL:
        if (target === undefined) return true;
        return isArray(target);
      case ARRAY.OPTIONAL.NULLABLE:
        if (target === undefined || target === null) return true;
        return isArray(target);
      case ARRAY.NONEMPTY:
        return isNonEmptyArray(target);
      case ARRAY.NULLABLE:
        if (target === null) return true;
        return isArray(target);

      case OBJECT:
        return isObject(target);
      case OBJECT.OPTIONAL:
        if (target === undefined) return true;
        return isObject(target);
      case OBJECT.OPTIONAL.NULLABLE:
        if (target === undefined || target === null) return true;
        return isObject(target);
      case OBJECT.NONEMPTY:
        return isNonEmptyObject(target);
      case OBJECT.NULLABLE:
        if (target === null) return true;
        return isObject(target);

      case NOTEXISTS:
        return (target === undefined);

      default:
        if (typeof spec === 'function') return spec(target);
        if (isObject(spec) && isObject(target)) {
          return Object.keys(spec).every((k) => like(target[k], spec[k]));
        }
        if (isArray(spec) && isArray(target)) {
          if (spec.length === 0) return true; // vacuous truth
          if (target.length === 0) return false;
          return target.every((t) => like(t, spec[0]));
        }
        if (isNaNNumber(target) && isNaNNumber(spec)) return true;
        if (isString(target) && isRegExp(spec) && spec.test(target)) return true;
        return (target === spec);
    }
  });
}

function likeThrow(...args) {
  if (!like(...args)) throw new Error('type mismatch');
}

module.exports = {
  TYPES,
  isString,
  isNonEmptyString,
  isRegExp,
  isNumber,
  isNaN,
  isInteger,
  isBoolean,
  isArray,
  isNonEmptyArray,
  isObject,
  isNonEmptyObject,
  like,
  likeThrow,
};

// eslint-disable-next-line no-constant-condition
if (false) {
  const a = module.exports;
  let type;

  console.log('--- specials ---');
  console.log(a.like(undefined, undefined)); // true
  console.log(a.like(null, null));
  console.log(a.like(undefined, null)); // false

  console.log('--- strings ---');
  console.log(a.like('foo', 'foo')); // true
  console.log(a.like('foo', 'FOO')); // false
  console.log(a.like(false, '0'));
  console.log(a.like(true, '1'));
  console.log(a.like(false, 'false'));
  console.log(a.like(true, 'true'));
  console.log(a.like(null, 'null'));
  console.log(a.like(undefined, 'undefined'));
  console.log(a.like(1, '1'));

  console.log('--- regexp ---');
  console.log(a.like('foo', /^f/)); // true
  console.log(a.like('foo', /^f.o$/));
  console.log(a.like('foo', /^F/i));
  console.log(a.like('foo', /o/));
  console.log(a.like('foo', /^F/)); // false
  console.log(a.like('foo', /^oo/));

  console.log('--- numbers ---');
  console.log(a.like(0, 0)); // true
  console.log(a.like(Math.sqrt(-1), Math.sqrt(-1)));
  console.log(a.like(0, 1)); // false
  console.log(a.like(0, Math.sqrt(-1)));

  console.log('--- booleans ---');
  console.log(a.like(false, false)); // true
  console.log(a.like(true, true));
  console.log(a.like(false, true)); // false
  console.log(a.like(null, false));
  console.log(a.like(undefined, false));
  console.log(a.like(false, 0));
  console.log(a.like(true, 1));

  console.log('--- array ---');
  console.log(a.like([], [])); // true
  console.log(a.like([null], []));
  console.log(a.like(['foo'], ['foo']));
  console.log(a.like(['foo', 'foo'], ['foo']));
  console.log(a.like([undefined, undefined], [undefined]));
  console.log(a.like(['foo'], ['FOO'])); // false
  console.log(a.like(['foo', 'bar'], ['foo']));
  console.log(a.like([], ['foo']));
  console.log(a.like([], [undefined]));

  console.log('--- objects ---');
  console.log(a.like({}, {})); // true
  console.log(a.like({key: 'val'}, {}));
  console.log(a.like({}, {key: 'val'})); // false
  console.log(a.like({key: 'foo'}, {key: 'bar'}));
  console.log(a.like(undefined, {}));
  console.log(a.like(null, {}));

  console.log('--- TYPES.STRING ---');
  type = a.TYPES.STRING;
  console.log(a.like('', type)); // true
  console.log(a.like('foo', type));
  console.log(a.like('foo', type.NONEMPTY));
  console.log(a.like(undefined, type.OPTIONAL));
  console.log(a.like('', type.OPTIONAL));
  console.log(a.like('foo', type.OPTIONAL.NULLABLE));
  console.log(a.like(null, type.OPTIONAL.NULLABLE));
  console.log(a.like(undefined, type.OPTIONAL.NULLABLE));
  console.log(a.like('foo', type.NULLABLE));
  console.log(a.like(null, type.NULLABLE));
  console.log(a.like(null, type.OPTIONAL)); // false
  console.log(a.like('', type.NONEMPTY));
  console.log(a.like({}, type));
  console.log(a.like(null, type));
  console.log(a.like(undefined, type));
  console.log(a.like(1, type));
  console.log(a.like(Math.sqrt(-1), type));
  console.log(a.like(true, type));
  console.log(a.like(undefined, type.NULLABLE));
  console.log(a.like(1, type.OPTIONAL.NULLABLE));
  console.log(a.like(1, type.NULLABLE));
  console.log(a.like(undefined, type.NULLABLE));

  console.log('--- TYPES.NUMBER ---');
  type = a.TYPES.NUMBER;
  console.log(a.like(0, type)); // true
  console.log(a.like(0.1, type));
  console.log(a.like(Number.MAX_SAFE_INTEGER, type));
  console.log(a.like(undefined, type.OPTIONAL));
  console.log(a.like(0.1, type.OPTIONAL.NULLABLE));
  console.log(a.like(null, type.OPTIONAL.NULLABLE));
  console.log(a.like(undefined, type.OPTIONAL.NULLABLE));
  console.log(a.like(0.1, type.NULLABLE));
  console.log(a.like(null, type.NULLABLE));
  console.log(a.like(null, type.OPTIONAL)); // false
  console.log(a.like(Math.sqrt(-1), type));
  console.log(a.like(false, type));
  console.log(a.like('0', type));
  console.log(a.like(null, type));
  console.log(a.like(undefined, type));
  console.log(a.like(undefined, type.NULLABLE));
  console.log(a.like('foo', type.OPTIONAL.NULLABLE));
  console.log(a.like('foo', type.NULLABLE));
  console.log(a.like(undefined, type.NULLABLE));

  console.log('--- TYPES.INTEGER ---');
  type = a.TYPES.INTEGER;
  console.log(a.like(0, type)); // true
  console.log(a.like(0.0, type));
  console.log(a.like(Number.MAX_SAFE_INTEGER, type));
  console.log(a.like(-Number.MAX_SAFE_INTEGER, type));
  console.log(a.like(undefined, type.OPTIONAL));
  console.log(a.like(0, type.OPTIONAL.NULLABLE));
  console.log(a.like(null, type.OPTIONAL.NULLABLE));
  console.log(a.like(undefined, type.OPTIONAL.NULLABLE));
  console.log(a.like(0, type.NULLABLE));
  console.log(a.like(null, type.NULLABLE));
  console.log(a.like(null, type.OPTIONAL)); // false
  console.log(a.like(Number.MAX_SAFE_INTEGER + 1, type));
  console.log(a.like(-Number.MAX_SAFE_INTEGER - 1, type));
  console.log(a.like(0.000001, type));
  console.log(a.like(Math.sqrt(-1), type));
  console.log(a.like('0', type));
  console.log(a.like(null, type));
  console.log(a.like(undefined, type));
  console.log(a.like(undefined, type.NULLABLE));
  console.log(a.like('foo', type.OPTIONAL.NULLABLE));
  console.log(a.like('foo', type.NULLABLE));
  console.log(a.like(undefined, type.NULLABLE));

  console.log('--- TYPES.BOOLEAN ---');
  type = a.TYPES.BOOLEAN;
  console.log(a.like(false, type)); // true
  console.log(a.like(true, type));
  console.log(a.like(undefined, type.OPTIONAL));
  console.log(a.like(false, type.OPTIONAL.NULLABLE));
  console.log(a.like(null, type.OPTIONAL.NULLABLE));
  console.log(a.like(undefined, type.OPTIONAL.NULLABLE));
  console.log(a.like(true, type.NULLABLE));
  console.log(a.like(null, type.NULLABLE));
  console.log(a.like(null, type.OPTIONAL)); // false
  console.log(a.like('', type));
  console.log(a.like('false', type));
  console.log(a.like('true', type));
  console.log(a.like(0, type));
  console.log(a.like(1, type));
  console.log(a.like(null, type));
  console.log(a.like(undefined, type));
  console.log(a.like(undefined, type.NULLABLE));
  console.log(a.like('foo', type.OPTIONAL.NULLABLE));
  console.log(a.like('foo', type.NULLABLE));
  console.log(a.like(undefined, type.NULLABLE));

  console.log('--- TYPES.ARRAY ---');
  type = a.TYPES.ARRAY;
  console.log(a.like([], type)); // true
  console.log(a.like(['foo'], type.NONEMPTY));
  console.log(a.like(undefined, type.OPTIONAL));
  console.log(a.like([], type.OPTIONAL.NULLABLE));
  console.log(a.like(null, type.OPTIONAL.NULLABLE));
  console.log(a.like(undefined, type.OPTIONAL.NULLABLE));
  console.log(a.like([], type.NULLABLE));
  console.log(a.like(null, type.NULLABLE));
  console.log(a.like(null, type.OPTIONAL)); // false
  console.log(a.like([], type.NONEMPTY));
  console.log(a.like({}, type));
  console.log(a.like({}, type.OPTIONAL));
  console.log(a.like(false, type));
  console.log(a.like(true, type));
  console.log(a.like('', type));
  console.log(a.like(0, type));
  console.log(a.like(null, type));
  console.log(a.like(undefined, type));
  console.log(a.like(undefined, type.NULLABLE));
  console.log(a.like('foo', type.OPTIONAL.NULLABLE));
  console.log(a.like('foo', type.NULLABLE));
  console.log(a.like(undefined, type.NULLABLE));

  console.log('--- TYPES.OBJECT ---');
  type = a.TYPES.OBJECT;
  console.log(a.like({}, type)); // true
  console.log(a.like({foo: 1}, type));
  console.log(a.like({foo: 1}, type.NONEMPTY));
  console.log(a.like(undefined, type.OPTIONAL));
  console.log(a.like({}, type.OPTIONAL.NULLABLE));
  console.log(a.like(null, type.OPTIONAL.NULLABLE));
  console.log(a.like(undefined, type.OPTIONAL.NULLABLE));
  console.log(a.like({}, type.NULLABLE));
  console.log(a.like(null, type.NULLABLE));
  console.log(a.like({}, type.NONEMPTY)); // false
  console.log(a.like([], type));
  console.log(a.like([], type.OPTIONAL));
  console.log(a.like(null, type.OPTIONAL));
  console.log(a.like(false, type));
  console.log(a.like(true, type));
  console.log(a.like('', type));
  console.log(a.like(0, type));
  console.log(a.like(null, type));
  console.log(a.like(undefined, type));
  console.log(a.like(undefined, type.NULLABLE));
  console.log(a.like('foo', type.OPTIONAL.NULLABLE));
  console.log(a.like('foo', type.NULLABLE));
  console.log(a.like(undefined, type.NULLABLE));

  console.log('--- complex OBJECT ---');
  console.log(a.like( // true
    {
      id: 'id',
      body: {
        nested: {},
      },
    },
    {
      id: a.TYPES.STRING.NONEMPTY,
      body: {
        nested: a.TYPES.OBJECT,
        optional: a.TYPES.OBJECT.OPTIONAL,
      },
    },
  ));
  console.log(a.like(
    {
      id: 'id',
      body: {nested: {}},
      xtra: null,
    },
    {
      id: a.TYPES.STRING.NONEMPTY,
      body: {nested: a.TYPES.OBJECT},
    },
  ));
  console.log(a.like(
    {arr: 'bar'},
    {arr: a.TYPES.ARRAY.NONEMPTY},
    {arr: a.TYPES.STRING.NONEMPTY},
  ));
  console.log(a.like(
    {id: 1},
    {id: a.TYPES.STRING.NONEMPTY},
    {id: a.TYPES.NUMBER},
  ));
  console.log(a.like( // false
    {
      id: 'id',
      body: {},
    },
    {
      id: a.TYPES.STRING.NONEMPTY,
      body: a.TYPES.OBJECT.NONEMPTY,
    },
  ));
  console.log(a.like(
    {arr: []},
    {arr: a.TYPES.ARRAY.NONEMPTY},
  ));

  console.log('--- complex ARRAY ---');
  console.log(a.like( // true
    ['foo', 'bar', 'fred'],
    [a.TYPES.STRING.NONEMPTY],
  ));
  console.log(a.like(
    ['foo', undefined, 'bar'],
    [a.TYPES.STRING.OPTIONAL],
  ));
  console.log(a.like(
    [['foo', 'bar'], ['fred']],
    [[a.TYPES.STRING.NONEMPTY]],
  ));
  console.log(a.like(
    [['foo', 'bar'], ['fred']],
    [[a.TYPES.STRING.NONEMPTY]],
  ));
  console.log(a.like( // false
    [['foo', 'bar'], []],
    [[a.TYPES.STRING]],
  ));
  console.log(a.like(
    [['foo', 'bar'], []],
    [[a.TYPES.STRING.OPTIONAL]],
  ));
  console.log(a.like(
    [{}, true],
    [a.TYPES.OBJECT],
    [a.TYPES.BOOLEAN],
  ));
  console.log(a.like(
    ['foo', 'bar', ''],
    [a.TYPES.STRING.NONEMPTY],
  ));

  console.log('--- TYPES.NOTEXISTS ---');
  type = a.TYPES.NOTEXISTS;
  console.log(like(undefined, type)); // true
  console.log(like(
    {},
    {foo: type},
  ));
  console.log(like(
    {foo: true, bar: 1},
    {foo: TYPES.BOOLEAN, bar: TYPES.NUMBER},
    {foo: TYPES.NOTEXISTS, bar: TYPES.NUMBER},
    {foo: TYPES.BOOLEAN, bar: TYPES.NOTEXISTS},
  ));
  console.log(like(
    {foo: true},
    {foo: TYPES.BOOLEAN, bar: TYPES.NUMBER},
    {foo: TYPES.NOTEXISTS, bar: TYPES.NUMBER},
    {foo: TYPES.BOOLEAN, bar: TYPES.NOTEXISTS},
  ));
  console.log(like(
    {bar: 1},
    {foo: TYPES.BOOLEAN, bar: TYPES.NUMBER},
    {foo: TYPES.NOTEXISTS, bar: TYPES.NUMBER},
    {foo: TYPES.BOOLEAN, bar: TYPES.NOTEXISTS},
  ));
  console.log(like(
    {foo: 'foo', bar: [1]},
    {foo: TYPES.STRING.NONEMPTY, bar: [TYPES.NUMBER]},
    {foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS},
    {foo: TYPES.NOTEXISTS, bar: [TYPES.NUMBER]},
  ));
  console.log(like(
    {foo: 'foo'},
    {foo: TYPES.STRING.NONEMPTY, bar: [TYPES.NUMBER]},
    {foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS},
    {foo: TYPES.NOTEXISTS, bar: [TYPES.NUMBER]},
  ));
  console.log(like(
    {bar: [1]},
    {foo: TYPES.STRING.NONEMPTY, bar: [TYPES.NUMBER]},
    {foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS},
    {foo: TYPES.NOTEXISTS, bar: [TYPES.NUMBER]},
  ));
  console.log(like( // false
    {foo: true, bar: '1'},
    {foo: TYPES.BOOLEAN, bar: TYPES.NUMBER},
    {foo: TYPES.NOTEXISTS, bar: TYPES.NUMBER},
    {foo: TYPES.BOOLEAN, bar: TYPES.NOTEXISTS},
  ));
  console.log(like(
    {},
    {foo: TYPES.STRING.NONEMPTY, bar: [TYPES.NUMBER]},
    {foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS},
    {foo: TYPES.NOTEXISTS, bar: [TYPES.NUMBER]},
  ));
  console.log(like(
    {foo: 'foo', bar: ['1']},
    {foo: TYPES.STRING.NONEMPTY, bar: [TYPES.NUMBER]},
    {foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS},
    {foo: TYPES.NOTEXISTS, bar: [TYPES.NUMBER]},
  ));
  console.log(like(false, type));
  console.log(like(null, type));
  console.log(like('', type));

  console.log('--- for comparison ---');
  console.log(like( // true
    {},
    {foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER.OPTIONAL},
  ));
  console.log(like( // false
    {foo: 'true'},
    {foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER.OPTIONAL},
  ));
  console.log(like( // true
    {foo: true, bar: 1},
    {foo: TYPES.BOOLEAN, bar: TYPES.NUMBER.OPTIONAL},
    {foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER},
  ));
  console.log(like( // false
    {},
    {foo: TYPES.BOOLEAN, bar: TYPES.NUMBER.OPTIONAL},
    {foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER},
  ));
  console.log(like( // false
    {foo: true, bar: '1'},
    {foo: TYPES.BOOLEAN, bar: TYPES.NUMBER.OPTIONAL},
    {foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER},
  ));
  console.log(like( // true
    {foo: 'foo', bar: [1]},
    {foo: TYPES.STRING.NONEMPTY, bar: TYPES.ARRAY.OPTIONAL},
    {foo: TYPES.STRING.OPTIONAL, bar: [TYPES.NUMBER]},
  ));
  console.log(like( // true
    {foo: 'foo', bar: ['1']},
    {foo: TYPES.STRING.NONEMPTY, bar: TYPES.ARRAY.OPTIONAL},
    {foo: TYPES.STRING.OPTIONAL, bar: [TYPES.NUMBER]},
  ));
  console.log(like( // false
    {bar: ['1']},
    {foo: TYPES.STRING.NONEMPTY, bar: TYPES.ARRAY.OPTIONAL},
    {foo: TYPES.STRING.OPTIONAL, bar: [TYPES.NUMBER]},
  ));

  console.log('--- for custom ---');
  console.log(like((_t) => false, (_t) => true)); // true
  console.log(like({foo: 1}, (t) => t.foo === 1));
  console.log(like(false, (t) => t)); // false
}

// end of assert.js

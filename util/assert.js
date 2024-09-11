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

export const TYPES = {
  STRING: new Type('STRING', {
    optional: true,
    nonempty: true,
    nullable: true,
  }),
  NUMBER: new Type('NUMBER', {
    optional: true,
    nullable: true,
  }),
  INTEGER: new Type('INTEGER', {
    optional: true,
    nullable: true,
  }),
  BOOLEAN: new Type('BOOLEAN', {
    optional: true,
    nullable: true,
  }),
  ARRAY: new Type('ARRAY', {
    optional: true,
    nonempty: true,
    nullable: true,
  }),
  OBJECT: new Type('OBJECT', {
    optional: true,
    nonempty: true,
    nullable: true,
  }),
  NOTEXISTS: new Type('NOTEXISTS'),
};

export function isString(target) {
  return typeof target === 'string';
}

export function isNonEmptyString(target) {
  return !!(isString(target) && target);
}

export function isRegExp(target) {
  return target instanceof RegExp;
}

export function isNumber(target) {
  return !!(typeof target === 'number' && isFinite(target));
}

export function isNaNNumber(target) {
  return !!(typeof target === 'number' && isNaN(target));
}

export function isInteger(target) {
  return isNumber(target) && Math.floor(target) === target &&
    Math.abs(target) <= Number.MAX_SAFE_INTEGER;
}

export function isBoolean(target) {
  return typeof target === 'boolean';
}

export function isArray(target) {
  return Array.isArray(target);
}

export function isNonEmptyArray(target) {
  return isArray(target) && target.length > 0;
}

export function isObject(target) {
  return !!(target && target.constructor === Object); // array excluded
}

export function isNonEmptyObject(target) {
  return isObject(target) && Object.keys(target).length > 0;
}

export function like(target, ...specs) {
  const {
    STRING,
    NUMBER,
    INTEGER,
    BOOLEAN,
    ARRAY,
    OBJECT,
    NOTEXISTS,
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

export function likeThrow(...args) {
  if (!like(...args)) throw new Error('type mismatch');
}

// eslint-disable-next-line no-constant-condition
if (false) {
  let type;

  console.log('--- specials ---');
  console.log(like(undefined, undefined)); // true
  console.log(like(null, null));
  console.log(like(undefined, null)); // false

  console.log('--- strings ---');
  console.log(like('foo', 'foo')); // true
  console.log(like('foo', 'FOO')); // false
  console.log(like(false, '0'));
  console.log(like(true, '1'));
  console.log(like(false, 'false'));
  console.log(like(true, 'true'));
  console.log(like(null, 'null'));
  console.log(like(undefined, 'undefined'));
  console.log(like(1, '1'));

  console.log('--- regexp ---');
  console.log(like('foo', /^f/)); // true
  console.log(like('foo', /^f.o$/));
  console.log(like('foo', /^F/i));
  console.log(like('foo', /o/));
  console.log(like('foo', /^F/)); // false
  console.log(like('foo', /^oo/));

  console.log('--- numbers ---');
  console.log(like(0, 0)); // true
  console.log(like(Math.sqrt(-1), Math.sqrt(-1)));
  console.log(like(0, 1)); // false
  console.log(like(0, Math.sqrt(-1)));

  console.log('--- booleans ---');
  console.log(like(false, false)); // true
  console.log(like(true, true));
  console.log(like(false, true)); // false
  console.log(like(null, false));
  console.log(like(undefined, false));
  console.log(like(false, 0));
  console.log(like(true, 1));

  console.log('--- array ---');
  console.log(like([], [])); // true
  console.log(like([null], []));
  console.log(like(['foo'], ['foo']));
  console.log(like(['foo', 'foo'], ['foo']));
  console.log(like([undefined, undefined], [undefined]));
  console.log(like(['foo'], ['FOO'])); // false
  console.log(like(['foo', 'bar'], ['foo']));
  console.log(like([], ['foo']));
  console.log(like([], [undefined]));

  console.log('--- objects ---');
  console.log(like({}, {})); // true
  console.log(like({key: 'val'}, {}));
  console.log(like({}, {key: 'val'})); // false
  console.log(like({key: 'foo'}, {key: 'bar'}));
  console.log(like(undefined, {}));
  console.log(like(null, {}));

  console.log('--- TYPES.STRING ---');
  type = TYPES.STRING;
  console.log(like('', type)); // true
  console.log(like('foo', type));
  console.log(like('foo', type.NONEMPTY));
  console.log(like(undefined, type.OPTIONAL));
  console.log(like('', type.OPTIONAL));
  console.log(like('foo', type.OPTIONAL.NULLABLE));
  console.log(like(null, type.OPTIONAL.NULLABLE));
  console.log(like(undefined, type.OPTIONAL.NULLABLE));
  console.log(like('foo', type.NULLABLE));
  console.log(like(null, type.NULLABLE));
  console.log(like(null, type.OPTIONAL)); // false
  console.log(like('', type.NONEMPTY));
  console.log(like({}, type));
  console.log(like(null, type));
  console.log(like(undefined, type));
  console.log(like(1, type));
  console.log(like(Math.sqrt(-1), type));
  console.log(like(true, type));
  console.log(like(undefined, type.NULLABLE));
  console.log(like(1, type.OPTIONAL.NULLABLE));
  console.log(like(1, type.NULLABLE));
  console.log(like(undefined, type.NULLABLE));

  console.log('--- TYPES.NUMBER ---');
  type = TYPES.NUMBER;
  console.log(like(0, type)); // true
  console.log(like(0.1, type));
  console.log(like(Number.MAX_SAFE_INTEGER, type));
  console.log(like(undefined, type.OPTIONAL));
  console.log(like(0.1, type.OPTIONAL.NULLABLE));
  console.log(like(null, type.OPTIONAL.NULLABLE));
  console.log(like(undefined, type.OPTIONAL.NULLABLE));
  console.log(like(0.1, type.NULLABLE));
  console.log(like(null, type.NULLABLE));
  console.log(like(null, type.OPTIONAL)); // false
  console.log(like(Math.sqrt(-1), type));
  console.log(like(false, type));
  console.log(like('0', type));
  console.log(like(null, type));
  console.log(like(undefined, type));
  console.log(like(undefined, type.NULLABLE));
  console.log(like('foo', type.OPTIONAL.NULLABLE));
  console.log(like('foo', type.NULLABLE));
  console.log(like(undefined, type.NULLABLE));

  console.log('--- TYPES.INTEGER ---');
  type = TYPES.INTEGER;
  console.log(like(0, type)); // true
  console.log(like(0.0, type));
  console.log(like(Number.MAX_SAFE_INTEGER, type));
  console.log(like(-Number.MAX_SAFE_INTEGER, type));
  console.log(like(undefined, type.OPTIONAL));
  console.log(like(0, type.OPTIONAL.NULLABLE));
  console.log(like(null, type.OPTIONAL.NULLABLE));
  console.log(like(undefined, type.OPTIONAL.NULLABLE));
  console.log(like(0, type.NULLABLE));
  console.log(like(null, type.NULLABLE));
  console.log(like(null, type.OPTIONAL)); // false
  console.log(like(Number.MAX_SAFE_INTEGER + 1, type));
  console.log(like(-Number.MAX_SAFE_INTEGER - 1, type));
  console.log(like(0.000001, type));
  console.log(like(Math.sqrt(-1), type));
  console.log(like('0', type));
  console.log(like(null, type));
  console.log(like(undefined, type));
  console.log(like(undefined, type.NULLABLE));
  console.log(like('foo', type.OPTIONAL.NULLABLE));
  console.log(like('foo', type.NULLABLE));
  console.log(like(undefined, type.NULLABLE));

  console.log('--- TYPES.BOOLEAN ---');
  type = TYPES.BOOLEAN;
  console.log(like(false, type)); // true
  console.log(like(true, type));
  console.log(like(undefined, type.OPTIONAL));
  console.log(like(false, type.OPTIONAL.NULLABLE));
  console.log(like(null, type.OPTIONAL.NULLABLE));
  console.log(like(undefined, type.OPTIONAL.NULLABLE));
  console.log(like(true, type.NULLABLE));
  console.log(like(null, type.NULLABLE));
  console.log(like(null, type.OPTIONAL)); // false
  console.log(like('', type));
  console.log(like('false', type));
  console.log(like('true', type));
  console.log(like(0, type));
  console.log(like(1, type));
  console.log(like(null, type));
  console.log(like(undefined, type));
  console.log(like(undefined, type.NULLABLE));
  console.log(like('foo', type.OPTIONAL.NULLABLE));
  console.log(like('foo', type.NULLABLE));
  console.log(like(undefined, type.NULLABLE));

  console.log('--- TYPES.ARRAY ---');
  type = TYPES.ARRAY;
  console.log(like([], type)); // true
  console.log(like(['foo'], type.NONEMPTY));
  console.log(like(undefined, type.OPTIONAL));
  console.log(like([], type.OPTIONAL.NULLABLE));
  console.log(like(null, type.OPTIONAL.NULLABLE));
  console.log(like(undefined, type.OPTIONAL.NULLABLE));
  console.log(like([], type.NULLABLE));
  console.log(like(null, type.NULLABLE));
  console.log(like(null, type.OPTIONAL)); // false
  console.log(like([], type.NONEMPTY));
  console.log(like({}, type));
  console.log(like({}, type.OPTIONAL));
  console.log(like(false, type));
  console.log(like(true, type));
  console.log(like('', type));
  console.log(like(0, type));
  console.log(like(null, type));
  console.log(like(undefined, type));
  console.log(like(undefined, type.NULLABLE));
  console.log(like('foo', type.OPTIONAL.NULLABLE));
  console.log(like('foo', type.NULLABLE));
  console.log(like(undefined, type.NULLABLE));

  console.log('--- TYPES.OBJECT ---');
  type = TYPES.OBJECT;
  console.log(like({}, type)); // true
  console.log(like({foo: 1}, type));
  console.log(like({foo: 1}, type.NONEMPTY));
  console.log(like(undefined, type.OPTIONAL));
  console.log(like({}, type.OPTIONAL.NULLABLE));
  console.log(like(null, type.OPTIONAL.NULLABLE));
  console.log(like(undefined, type.OPTIONAL.NULLABLE));
  console.log(like({}, type.NULLABLE));
  console.log(like(null, type.NULLABLE));
  console.log(like({}, type.NONEMPTY)); // false
  console.log(like([], type));
  console.log(like([], type.OPTIONAL));
  console.log(like(null, type.OPTIONAL));
  console.log(like(false, type));
  console.log(like(true, type));
  console.log(like('', type));
  console.log(like(0, type));
  console.log(like(null, type));
  console.log(like(undefined, type));
  console.log(like(undefined, type.NULLABLE));
  console.log(like('foo', type.OPTIONAL.NULLABLE));
  console.log(like('foo', type.NULLABLE));
  console.log(like(undefined, type.NULLABLE));

  console.log('--- complex OBJECT ---');
  console.log(like( // true
    {
      id: 'id',
      body: {
        nested: {},
      },
    },
    {
      id: TYPES.STRING.NONEMPTY,
      body: {
        nested: TYPES.OBJECT,
        optional: TYPES.OBJECT.OPTIONAL,
      },
    },
  ));
  console.log(like(
    {
      id: 'id',
      body: {nested: {}},
      xtra: null,
    },
    {
      id: TYPES.STRING.NONEMPTY,
      body: {nested: TYPES.OBJECT},
    },
  ));
  console.log(like(
    {arr: 'bar'},
    {arr: TYPES.ARRAY.NONEMPTY},
    {arr: TYPES.STRING.NONEMPTY},
  ));
  console.log(like(
    {id: 1},
    {id: TYPES.STRING.NONEMPTY},
    {id: TYPES.NUMBER},
  ));
  console.log(like( // false
    {
      id: 'id',
      body: {},
    },
    {
      id: TYPES.STRING.NONEMPTY,
      body: TYPES.OBJECT.NONEMPTY,
    },
  ));
  console.log(like(
    {arr: []},
    {arr: TYPES.ARRAY.NONEMPTY},
  ));

  console.log('--- complex ARRAY ---');
  console.log(like( // true
    ['foo', 'bar', 'fred'],
    [TYPES.STRING.NONEMPTY],
  ));
  console.log(like(
    ['foo', undefined, 'bar'],
    [TYPES.STRING.OPTIONAL],
  ));
  console.log(like(
    [['foo', 'bar'], ['fred']],
    [[TYPES.STRING.NONEMPTY]],
  ));
  console.log(like(
    [['foo', 'bar'], ['fred']],
    [[TYPES.STRING.NONEMPTY]],
  ));
  console.log(like( // false
    [['foo', 'bar'], []],
    [[TYPES.STRING]],
  ));
  console.log(like(
    [['foo', 'bar'], []],
    [[TYPES.STRING.OPTIONAL]],
  ));
  console.log(like(
    [{}, true],
    [TYPES.OBJECT],
    [TYPES.BOOLEAN],
  ));
  console.log(like(
    ['foo', 'bar', ''],
    [TYPES.STRING.NONEMPTY],
  ));

  console.log('--- TYPES.NOTEXISTS ---');
  type = TYPES.NOTEXISTS;
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

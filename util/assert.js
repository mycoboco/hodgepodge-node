/*
 *  assetions to check types
 */


function Type(name, xtra) {
    this.name = name
    if (xtra) {
        if (xtra.optional) this.OPTIONAL = new Type(`${name}.OPTIONAL`)
        if (xtra.nullable) this.NULLABLE = new Type(`${name}.NULLABLE`)
        if (xtra.optional && xtra.nullable) {
            this.NULLABLE.OPTIONAL = this.OPTIONAL.NULLABLE = new Type(`${name}.OPTIONAL.NULLABLE`)
        }
        if (xtra.nonempty) this.NONEMPTY = new Type(`${name}.NONEMPTY`)
    }
}


const TYPES = {
    STRING:    new Type('STRING',    { optional: true, nonempty: true, nullable: true }),
    NUMBER:    new Type('NUMBER',    { optional: true, nullable: true }),
    INTEGER:   new Type('INTEGER',   { optional: true, nullable: true }),
    BOOLEAN:   new Type('BOOLEAN',   { optional: true, nullable: true }),
    ARRAY:     new Type('ARRAY',     { optional: true, nonempty: true, nullable: true }),
    OBJECT:    new Type('OBJECT',    { optional: true, nonempty: true, nullable: true }),
    NOTEXISTS: new Type('NOTEXISTS')
}


function isString(target) {
    return typeof target === 'string'
}


function isNonEmptyString(target) {
    return !!(isString(target) && target)
}


function isRegExp(target) {
    return target instanceof RegExp
}


function isNumber(target) {
    return !!(typeof target === 'number' && isFinite(target))
}


function isNaNNumber(target) {
    return !!(typeof target === 'number' && isNaN(target))
}


function isInteger(target) {
    return isNumber(target) && Math.floor(target) === target &&
           Math.abs(target) <= Number.MAX_SAFE_INTEGER
}


function isBoolean(target) {
    return typeof target === 'boolean'
}


function isArray(target) {
    return Array.isArray(target)
}


function isNonEmptyArray(target) {
    return isArray(target) && target.length > 0
}


function isObject(target) {
    return !!(target && target.constructor === Object)    // array excluded
}


function isNonEmptyObject(target) {
    return isObject(target) && Object.keys(target).length > 0
}


function like(target, ...specs) {
    const { STRING, NUMBER, INTEGER, BOOLEAN, ARRAY, OBJECT, NOTEXISTS } = TYPES

    return specs.some(spec => {
        switch(spec) {
            case STRING:
                return isString(target)
            case STRING.OPTIONAL:
                if (target === undefined) return true
                return isString(target)
            case STRING.OPTIONAL.NULLABLE:
                if (target === undefined || target === null) return true
                return isString(target)
            case STRING.NONEMPTY:
                return isNonEmptyString(target)
            case STRING.NULLABLE:
                if (target === null) return true
                return isString(target)

            case NUMBER:
                return isNumber(target)
            case NUMBER.OPTIONAL:
                if (target === undefined) return true
                return isNumber(target)
            case NUMBER.OPTIONAL.NULLABLE:
                if (target === undefined || target === null) return true
                return isNumber(target)
            case NUMBER.NULLABLE:
                if (target === null) return true
                return isNumber(target)

            case INTEGER:
                return isInteger(target)
            case INTEGER.OPTIONAL:
                if (target === undefined) return true
                return isInteger(target)
            case INTEGER.OPTIONAL.NULLABLE:
                if (target === undefined || target === null) return true
                return isInteger(target)
            case INTEGER.NULLABLE:
                if (target === null) return true
                return isInteger(target)

            case BOOLEAN:
                return isBoolean(target)
            case BOOLEAN.OPTIONAL:
                if (target === undefined) return true
                return isBoolean(target)
            case BOOLEAN.OPTIONAL.NULLABLE:
                if (target === undefined || target === null) return true
                return isBoolean(target)
            case BOOLEAN.NULLABLE:
                if (target === null) return true
                return isBoolean(target)

            case ARRAY:
                return isArray(target)
            case ARRAY.OPTIONAL:
                if (target === undefined) return true
                return isArray(target)
            case ARRAY.OPTIONAL.NULLABLE:
                if (target === undefined || target === null) return true
                return isArray(target)
            case ARRAY.NONEMPTY:
                return isNonEmptyArray(target)
            case ARRAY.NULLABLE:
                if (target === null) return true
                return isArray(target)

            case OBJECT:
                return isObject(target)
            case OBJECT.OPTIONAL:
                if (target === undefined) return true
                return isObject(target)
            case OBJECT.OPTIONAL.NULLABLE:
                if (target === undefined || target === null) return true
                return isObject(target)
            case OBJECT.NONEMPTY:
                return isNonEmptyObject(target)
            case OBJECT.NULLABLE:
                if (target === null) return true
                return isObject(target)

            case NOTEXISTS:
                return (target === undefined)

            default:
                if (isObject(spec) && isObject(target)) {
                    return Object.keys(spec).every(k => like(target[k], spec[k]))
                }
                if (isArray(spec) && isArray(target)) {
                    if (spec.length === 0) return true    // vacuous truth
                    if (target.length === 0) return false
                    return target.every(t => like(t, spec[0]))
                }
                if (isNaNNumber(target) && isNaNNumber(spec)) return true
                if (isString(target) && isRegExp(spec) && spec.test(target)) return true
                return (target === spec)
        }
    })
}


function likeThrow(...args) {
    if (!like(...args)) throw new Error('type mismatch')
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
    likeThrow
}


!true && !function () {
    const assert = module.exports
    let type

    console.log('--- specials ---')
    console.log(assert.like(undefined, undefined))    // true
    console.log(assert.like(null,      null))
    console.log(assert.like(undefined, null))         // false

    console.log('--- strings ---')
    console.log(assert.like('foo',     'foo'))          // true
    console.log(assert.like('foo',     'FOO'))          // false
    console.log(assert.like(false,     '0'))
    console.log(assert.like(true,      '1'))
    console.log(assert.like(false,     'false'))
    console.log(assert.like(true,      'true'))
    console.log(assert.like(null,      'null'))
    console.log(assert.like(undefined, 'undefined'))
    console.log(assert.like(1,         '1'))

    console.log('--- regexp ---')
    console.log(assert.like('foo', /^f/))
    console.log(assert.like('foo', /^f.o$/))
    console.log(assert.like('foo', /^F/i))
    console.log(assert.like('foo', /o/))
    console.log(assert.like('foo', /^F/))
    console.log(assert.like('foo', /^oo/))

    console.log('--- numbers ---')
    console.log(assert.like(0,             0))                // true
    console.log(assert.like(Math.sqrt(-1), Math.sqrt(-1)))
    console.log(assert.like(0,             1))                // false
    console.log(assert.like(0,             Math.sqrt(-1)))

    console.log('--- booleans ---')
    console.log(assert.like(false,     false))    // true
    console.log(assert.like(true,      true))
    console.log(assert.like(false,     true))     // false
    console.log(assert.like(null,      false))
    console.log(assert.like(undefined, false))
    console.log(assert.like(false,     0))
    console.log(assert.like(true,      1))

    console.log('--- array ---')
    console.log(assert.like([], []))                                 // true
    console.log(assert.like([null], []))
    console.log(assert.like(['foo'], ['foo']))
    console.log(assert.like(['foo', 'foo'], ['foo']))
    console.log(assert.like([undefined, undefined], [undefined]))
    console.log(assert.like(['foo'], ['FOO']))                       // false
    console.log(assert.like(['foo','bar'], ['foo']))
    console.log(assert.like([], ['foo']))
    console.log(assert.like([], [undefined]))

    console.log('--- objects ---')
    console.log(assert.like({},             {}))                // true
    console.log(assert.like({ key: 'val' }, {}))
    console.log(assert.like({},             { key: 'val' }))    // false
    console.log(assert.like({ key: 'foo' }, { key: 'bar' }))
    console.log(assert.like(undefined,      {}))
    console.log(assert.like(null,           {}))

    console.log('--- TYPES.STRING ---')
    type = assert.TYPES.STRING
    console.log(assert.like('',            type))                      // true
    console.log(assert.like('foo',         type))
    console.log(assert.like('foo',         type.NONEMPTY))
    console.log(assert.like(undefined,     type.OPTIONAL))
    console.log(assert.like('',            type.OPTIONAL))
    console.log(assert.like('foo',         type.OPTIONAL.NULLABLE))
    console.log(assert.like(null,          type.OPTIONAL.NULLABLE))
    console.log(assert.like(undefined,     type.OPTIONAL.NULLABLE))
    console.log(assert.like('foo',         type.NULLABLE))
    console.log(assert.like(null,          type.NULLABLE))
    console.log(assert.like(null,          type.OPTIONAL))             // false
    console.log(assert.like('',            type.NONEMPTY))
    console.log(assert.like({},            type))
    console.log(assert.like(null,          type))
    console.log(assert.like(undefined,     type))
    console.log(assert.like(1,             type))
    console.log(assert.like(Math.sqrt(-1), type))
    console.log(assert.like(true,          type))
    console.log(assert.like(undefined,     type.NULLABLE))
    console.log(assert.like(1,             type.OPTIONAL.NULLABLE))
    console.log(assert.like(1,             type.NULLABLE))
    console.log(assert.like(undefined,     type.NULLABLE))

    console.log('--- TYPES.NUMBER ---')
    type = assert.TYPES.NUMBER
    console.log(assert.like(0,                       type))                      // true
    console.log(assert.like(0.1,                     type))
    console.log(assert.like(Number.MAX_SAFE_INTEGER, type))
    console.log(assert.like(undefined,               type.OPTIONAL))
    console.log(assert.like(0.1,                     type.OPTIONAL.NULLABLE))
    console.log(assert.like(null,                    type.OPTIONAL.NULLABLE))
    console.log(assert.like(undefined,               type.OPTIONAL.NULLABLE))
    console.log(assert.like(0.1,                     type.NULLABLE))
    console.log(assert.like(null,                    type.NULLABLE))
    console.log(assert.like(null,                    type.OPTIONAL))             // false
    console.log(assert.like(Math.sqrt(-1),           type))
    console.log(assert.like(false,                   type))
    console.log(assert.like('0',                     type))
    console.log(assert.like(null,                    type))
    console.log(assert.like(undefined,               type))
    console.log(assert.like(undefined,               type.NULLABLE))
    console.log(assert.like('foo',                   type.OPTIONAL.NULLABLE))
    console.log(assert.like('foo',                   type.NULLABLE))
    console.log(assert.like(undefined,               type.NULLABLE))

    console.log('--- TYPES.INTEGER ---')
    type = assert.TYPES.INTEGER
    console.log(assert.like(0,                          type))                      // true
    console.log(assert.like(0.0,                        type))
    console.log(assert.like(Number.MAX_SAFE_INTEGER,    type))
    console.log(assert.like(-Number.MAX_SAFE_INTEGER,   type))
    console.log(assert.like(undefined,                  type.OPTIONAL))
    console.log(assert.like(0,                          type.OPTIONAL.NULLABLE))
    console.log(assert.like(null,                       type.OPTIONAL.NULLABLE))
    console.log(assert.like(undefined,                  type.OPTIONAL.NULLABLE))
    console.log(assert.like(0,                          type.NULLABLE))
    console.log(assert.like(null,                       type.NULLABLE))
    console.log(assert.like(null,                       type.OPTIONAL))             // false
    console.log(assert.like(Number.MAX_SAFE_INTEGER+1,  type))
    console.log(assert.like(-Number.MAX_SAFE_INTEGER-1, type))
    console.log(assert.like(0.000001,                   type))
    console.log(assert.like(Math.sqrt(-1),              type))
    console.log(assert.like('0',                        type))
    console.log(assert.like(null,                       type))
    console.log(assert.like(undefined,                  type))
    console.log(assert.like(undefined,                  type.NULLABLE))
    console.log(assert.like('foo',                      type.OPTIONAL.NULLABLE))
    console.log(assert.like('foo',                      type.NULLABLE))
    console.log(assert.like(undefined,                  type.NULLABLE))

    console.log('--- TYPES.BOOLEAN ---')
    type = assert.TYPES.BOOLEAN
    console.log(assert.like(false,     type))                      // true
    console.log(assert.like(true,      type))
    console.log(assert.like(undefined, type.OPTIONAL))
    console.log(assert.like(false,     type.OPTIONAL.NULLABLE))
    console.log(assert.like(null,      type.OPTIONAL.NULLABLE))
    console.log(assert.like(undefined, type.OPTIONAL.NULLABLE))
    console.log(assert.like(true,      type.NULLABLE))
    console.log(assert.like(null,      type.NULLABLE))
    console.log(assert.like(null,      type.OPTIONAL))             // false
    console.log(assert.like('',        type))
    console.log(assert.like('false',   type))
    console.log(assert.like('true',    type))
    console.log(assert.like(0,         type))
    console.log(assert.like(1,         type))
    console.log(assert.like(null,      type))
    console.log(assert.like(undefined, type))
    console.log(assert.like(undefined, type.NULLABLE))
    console.log(assert.like('foo',     type.OPTIONAL.NULLABLE))
    console.log(assert.like('foo',     type.NULLABLE))
    console.log(assert.like(undefined, type.NULLABLE))

    console.log('--- TYPES.ARRAY ---')
    type = assert.TYPES.ARRAY
    console.log(assert.like([],        type))                      // true
    console.log(assert.like(['foo'],   type.NONEMPTY))
    console.log(assert.like(undefined, type.OPTIONAL))
    console.log(assert.like([],        type.OPTIONAL.NULLABLE))
    console.log(assert.like(null,      type.OPTIONAL.NULLABLE))
    console.log(assert.like(undefined, type.OPTIONAL.NULLABLE))
    console.log(assert.like([],        type.NULLABLE))
    console.log(assert.like(null,      type.NULLABLE))
    console.log(assert.like(null,      type.OPTIONAL))             // false
    console.log(assert.like([],        type.NONEMPTY))
    console.log(assert.like({},        type))
    console.log(assert.like({},        type.OPTIONAL))
    console.log(assert.like(false,     type))
    console.log(assert.like(true,      type))
    console.log(assert.like('',        type))
    console.log(assert.like(0,         type))
    console.log(assert.like(null,      type))
    console.log(assert.like(undefined, type))
    console.log(assert.like(undefined, type.NULLABLE))
    console.log(assert.like('foo',     type.OPTIONAL.NULLABLE))
    console.log(assert.like('foo',     type.NULLABLE))
    console.log(assert.like(undefined, type.NULLABLE))

    console.log('--- TYPES.OBJECT ---')
    type = assert.TYPES.OBJECT
    console.log(assert.like({},         type))                      // true
    console.log(assert.like({ foo: 1 }, type))
    console.log(assert.like({ foo: 1 }, type.NONEMPTY))
    console.log(assert.like(undefined,  type.OPTIONAL))
    console.log(assert.like({},         type.OPTIONAL.NULLABLE))
    console.log(assert.like(null,       type.OPTIONAL.NULLABLE))
    console.log(assert.like(undefined,  type.OPTIONAL.NULLABLE))
    console.log(assert.like({},         type.NULLABLE))
    console.log(assert.like(null,       type.NULLABLE))
    console.log(assert.like({},         type.NONEMPTY))             // false
    console.log(assert.like([],         type))
    console.log(assert.like([],         type.OPTIONAL))
    console.log(assert.like(null,       type.OPTIONAL))
    console.log(assert.like(false,      type))
    console.log(assert.like(true,       type))
    console.log(assert.like('',         type))
    console.log(assert.like(0,          type))
    console.log(assert.like(null,       type))
    console.log(assert.like(undefined,  type))
    console.log(assert.like(undefined,  type.NULLABLE))
    console.log(assert.like('foo',      type.OPTIONAL.NULLABLE))
    console.log(assert.like('foo',      type.NULLABLE))
    console.log(assert.like(undefined,  type.NULLABLE))

    console.log('--- complex OBJECT ---')
    console.log(assert.like(    // true
        {
            id: 'id',
            body: {
                nested: {}
            }
        },
        {
            id: assert.TYPES.STRING.NONEMPTY,
            body: {
                nested:   assert.TYPES.OBJECT,
                optional: assert.TYPES.OBJECT.OPTIONAL
            }
        }
    ))
    console.log(assert.like(
        {
            id:   'id',
            body: { nested: {} },
            xtra: null
        },
        {
            id: assert.TYPES.STRING.NONEMPTY,
            body: { nested: assert.TYPES.OBJECT }
        }
    ))
    console.log(assert.like(
        { arr: 'bar' },
        { arr: assert.TYPES.ARRAY.NONEMPTY },
        { arr: assert.TYPES.STRING.NONEMPTY }
    ))
    console.log(assert.like(
        { id: 1 },
        { id: assert.TYPES.STRING.NONEMPTY },
        { id: assert.TYPES.NUMBER }
    ))
    console.log(assert.like(    // false
        {
            id:   'id',
            body: {}
        },
        {
            id:   assert.TYPES.STRING.NONEMPTY,
            body: assert.TYPES.OBJECT.NONEMPTY
        }
    ))
    console.log(assert.like(
        { arr: [] },
        { arr: assert.TYPES.ARRAY.NONEMPTY }
    ))

    console.log('--- complex ARRAY ---')
    console.log(assert.like(    // true
        [ 'foo', 'bar', 'fred' ],
        [ assert.TYPES.STRING.NONEMPTY ]
    ))
    console.log(assert.like(
        [ 'foo', undefined, 'bar' ],
        [ assert.TYPES.STRING.OPTIONAL ]
    ))
    console.log(assert.like(
        [ [ 'foo', 'bar' ], [ 'fred' ] ],
        [ [ assert.TYPES.STRING.NONEMPTY ] ]
    ))
    console.log(assert.like(
        [ [ 'foo', 'bar' ], [ 'fred' ] ],
        [ [ assert.TYPES.STRING.NONEMPTY ] ]
    ))
    console.log(assert.like(    // false
        [ [ 'foo', 'bar' ], [] ],
        [ [ assert.TYPES.STRING ] ]
    ))
    console.log(assert.like(
        [ [ 'foo', 'bar' ], [] ],
        [ [ assert.TYPES.STRING.OPTIONAL ] ]
    ))
    console.log(assert.like(
        [ {}, true ],
        [ assert.TYPES.OBJECT ],
        [ assert.TYPES.BOOLEAN ]
    ))
    console.log(assert.like(
        [ 'foo', 'bar', '' ],
        [ assert.TYPES.STRING.NONEMPTY ]
    ))

    console.log('--- TYPES.NOTEXISTS ---')
    type = assert.TYPES.NOTEXISTS
    console.log(like(undefined, type))    // true
    console.log(like(
        {},
        { foo: type }
    ))
    console.log(like(
        { foo: true,            bar: 1 },
        { foo: TYPES.BOOLEAN,   bar: TYPES.NUMBER },
        { foo: TYPES.NOTEXISTS, bar: TYPES.NUMBER },
        { foo: TYPES.BOOLEAN,   bar: TYPES.NOTEXISTS }
    ))
    console.log(like(
        { foo: true },
        { foo: TYPES.BOOLEAN,   bar: TYPES.NUMBER },
        { foo: TYPES.NOTEXISTS, bar: TYPES.NUMBER },
        { foo: TYPES.BOOLEAN,   bar: TYPES.NOTEXISTS }
    ))
    console.log(like(
        {                       bar: 1 },
        { foo: TYPES.BOOLEAN,   bar: TYPES.NUMBER },
        { foo: TYPES.NOTEXISTS, bar: TYPES.NUMBER },
        { foo: TYPES.BOOLEAN,   bar: TYPES.NOTEXISTS }
    ))
    console.log(like(
        { foo: 'foo',                 bar: [ 1 ] },
        { foo: TYPES.STRING.NONEMPTY, bar: [ TYPES.NUMBER ] },
        { foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS },
        { foo: TYPES.NOTEXISTS,       bar: [ TYPES.NUMBER ] }
    ))
    console.log(like(
        { foo: 'foo' },
        { foo: TYPES.STRING.NONEMPTY, bar: [ TYPES.NUMBER ] },
        { foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS },
        { foo: TYPES.NOTEXISTS,       bar: [ TYPES.NUMBER ] }
    ))
    console.log(like(
        {                             bar: [ 1 ] },
        { foo: TYPES.STRING.NONEMPTY, bar: [ TYPES.NUMBER ] },
        { foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS },
        { foo: TYPES.NOTEXISTS,       bar: [ TYPES.NUMBER ] }
    ))
    console.log(like(    // false
        { foo: true,            bar: '1' },
        { foo: TYPES.BOOLEAN,   bar: TYPES.NUMBER },
        { foo: TYPES.NOTEXISTS, bar: TYPES.NUMBER },
        { foo: TYPES.BOOLEAN,   bar: TYPES.NOTEXISTS }
    ))
    console.log(like(
        {},
        { foo: TYPES.STRING.NONEMPTY, bar: [ TYPES.NUMBER ] },
        { foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS },
        { foo: TYPES.NOTEXISTS,       bar: [ TYPES.NUMBER ] }
    ))
    console.log(like(
        { foo: 'foo',                 bar: [ '1' ] },
        { foo: TYPES.STRING.NONEMPTY, bar: [ TYPES.NUMBER ] },
        { foo: TYPES.STRING.NONEMPTY, bar: TYPES.NOTEXISTS },
        { foo: TYPES.NOTEXISTS,       bar: [ TYPES.NUMBER ] }
    ))
    console.log(like(false, type))
    console.log(like(null, type))
    console.log(like('', type))

    console.log('--- for comparison ---')
    console.log(like(    // true
        {},
        { foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER.OPTIONAL },
    ))
    console.log(like(    // false
        { foo: 'true' },
        { foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER.OPTIONAL },
    ))
    console.log(like(    // true
        { foo: true,                   bar: 1 },
        { foo: TYPES.BOOLEAN,          bar: TYPES.NUMBER.OPTIONAL },
        { foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER }
    ))
    console.log(like(    // false
        {},
        { foo: TYPES.BOOLEAN,          bar: TYPES.NUMBER.OPTIONAL },
        { foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER }
    ))
    console.log(like(    // false
        { foo: true,                   bar: '1' },
        { foo: TYPES.BOOLEAN,          bar: TYPES.NUMBER.OPTIONAL },
        { foo: TYPES.BOOLEAN.OPTIONAL, bar: TYPES.NUMBER }
    ))
    console.log(like(    // true
        { foo: 'foo',                 bar: [ 1 ] },
        { foo: TYPES.STRING.NONEMPTY, bar: TYPES.ARRAY.OPTIONAL },
        { foo: TYPES.STRING.OPTIONAL, bar: [ TYPES.NUMBER ] },
    ))
    console.log(like(    // true
        { foo: 'foo',                 bar: [ '1' ] },
        { foo: TYPES.STRING.NONEMPTY, bar: TYPES.ARRAY.OPTIONAL },
        { foo: TYPES.STRING.OPTIONAL, bar: [ TYPES.NUMBER ] },
    ))
    console.log(like(    // false
        {                             bar: [ '1' ] },
        { foo: TYPES.STRING.NONEMPTY, bar: TYPES.ARRAY.OPTIONAL },
        { foo: TYPES.STRING.OPTIONAL, bar: [ TYPES.NUMBER ] },
    ))
}()

// end of assert.js

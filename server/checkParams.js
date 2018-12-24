/*
 *  checks request parameters
 */

const { inspect } = require('util')

const ServerError = require('./ServerError')


function assert(assertion, code, variable, value = assertion) {
    if (!assertion) {
        const err = new ServerError(code, `invalid ${variable}: ${inspect(value)}`)
        throw err
    }

    return { and: assert }
}


module.exports = assert

// end of checkParams.js

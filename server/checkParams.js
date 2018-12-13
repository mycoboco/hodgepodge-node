/*
 *  checks request parameters
 */

const { inspect } = require('util')

const ServerError = require('./ServerError')


// [ assertion, status code, variable name, value ]
module.exports = (res, rules) => {
    return !rules.some(r => {
        if (!r[0]) {
            // expects res.err() to accept ServerError
            res.err(new ServerError(r[1], `invalid ${r[2]}: ${inspect(r[3])}`))
            return true
        }
    })
}

// end of checkParams.js

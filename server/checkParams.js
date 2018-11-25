/*
 *  checks request parameters
 */

const { inspect } = require('util')


// [ assertion, status code, variable name, value ]
module.exports = (res, rules) => {
    return !rules.some(r => {
        if (!r[0]) {
            res.err(r[1], new Error(`invalid ${r[2]}: ${insepct(r[3])}`))
            return true
        }
    })
}

// end of checkParams.js

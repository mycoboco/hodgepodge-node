/*
 *  checks request parameters
 */

'use strict'


module.exports = (res, rules) => {
    return !rules.some(r => {
        if (!r[0]) {
            res.err(r[1], new Error(`invalid ${r[2]}: ${r[3]}`))
            return true
        }
    })
}

// end of checkParams.js

/*
 *  handles range information from HTTP headers
 */

'use strict'


function parse(r, stats) {
    var range = function (r) {
        r = /bytes=([0-9]+)-([0-9]+)?/.exec(r)
        if (!r) return null

        return {
            s: +r[1],
            e: +r[2]
        }
    }

    if (!range) return null

    r = range(r)
    if (r) {
        if (r.e !== r.e) r.e = stats.size-1
        if (r.s >= stats.size || r.e >= stats.size || r.s > r.e) {
            return new Error('invalid range request: '+r)
        }
    }

    return r
}


function header(r, stats) {
    return 'bytes '+r.s+'-'+r.e+'/'+stats.size
}


module.exports = {
    parse:  parse,
    header: header
}

// end of range.js

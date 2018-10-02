/*
 *  handles range information from HTTP headers
 */


function parse(range, stats) {
    function parse(r) {
        r = /bytes=([0-9]+)-([0-9]+)?/.exec(r)
        if (!r) return null

        return {
            s: +r[1],
            e: +r[2]
        }
    }

    if (!range) return null

    const r = parse(range)
    if (r) {
        if (r.e !== r.e) r.e = stats.size-1
        if (r.s >= stats.size || r.e >= stats.size || r.s > r.e) {
            return new Error(`invalid range request: ${range}`)
        }
    }

    return r
}


function header(r, stats) {
    return `bytes ${r.s}-${r.e}/${stats.size}`
}


module.exports = {
    parse,
    header
}

// end of range.js

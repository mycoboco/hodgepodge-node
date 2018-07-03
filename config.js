/*
 *  konphyg wrapper
 */

const path = require('path')

const konfig = require('konphyg')


module.exports = (p, _conf) => {
    const conf = {}
    const config = konfig(p)

    Object.keys(_conf).forEach(p => {
        const sep = p.indexOf(':')
        const key = (sep >= 0)? p.substring(sep+1): p

        conf[key] = {
            ...config(path.join(p.substring(0, sep), key)),
            ..._conf[p]
        }
    })

    return conf
}

// end of config.js

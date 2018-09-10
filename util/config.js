/*
 *  konphyg wrapper
 */

const path = require('path')

const konfig = require('konphyg')


module.exports = (p = 'config', _conf) => {
    const conf = {}
    const config = konfig(p)

    Object.keys(_conf).forEach(p => {
        const sep = p.indexOf(':')
        const key = (sep >= 0)? p.substring(sep+1): p

        conf[key] = {
            ..._conf[p],
            ...config(path.join(p.substring(0, sep), key))
        }
    })

    return conf
}


!true && !function () {
    config = module.exports
    console.log(config(path.join('.', 'test'), {
        'foo': {
            'param': 1
        },
        'sub:bar': {
            'param': 2
        },
        'none': {
            'default': 3
        }
    }))
}()

// end of config.js

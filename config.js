/*
 *  konphyg wrapper
 */

var path = require('path')

var konfig = require('konphyg')
var defaults = require('defaults')


module.exports = function (p, _conf) {
    var conf = {}
    var config = konfig(p)

    Object.keys(_conf).forEach(function (p) {
        var sep = p.indexOf(':')
        var key = (sep >= 0)? p.substring(sep+1): p

        conf[key] = defaults(config(path.join(p.substring(0, sep), key)), _conf[p])
    })

    return conf
}

// end of config.js

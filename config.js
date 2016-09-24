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
        var key = path.basename(p)

        conf[key] = defaults(config(p), _conf[p])
    })

    return conf
}

// end of config.js

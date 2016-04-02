/*
 *  minifies and servers js
 */

'use strict'

var fs = require('fs')
var path = require('path')

var minify = require('minify')


var pub, log


function serve(_pub, _log) {
    var nop = function () {}

    pub = _pub
    log = _log || { info: nop, warning: nop, error: nop }

    return function (req, res, next) {
        var dir = path.dirname(req.url)
        var name = path.basename(req.url, '.min.js')

        minify(path.join(pub, dir, name+'.js'), function(err, result) {
            if (err) {
                log.error(err)
                next()
                return
            }
            res.header('Content-type', 'text/javascript')
               .send(result)
            fs.writeFile(path.join(pub, req.url), result, function (err) {
                if (err) log.error(err)
            })
        })
    }
}


function filter(req, res, next) {
    if (/.+\.js$/.test(req.path) && !/.+\.min\.js$/.test(req.path)) {
        res.sendStatus(404)
        return
    }
    next()
}


module.exports = {
    serve:  serve,
    filter: filter
}

// end of minjs.js

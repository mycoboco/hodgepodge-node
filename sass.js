/*
 *  compiles and servers scss
 */

'use strict'

var fs = require('fs')
var path = require('path')

var sass = require('node-sass')


var pub, log


function serve(_pub, _log) {
    var nop = function () {}

    pub = _pub
    log = _log || { info: nop, warning: nop, error: nop }

    return function (req, res, next) {
        var dir = path.dirname(req.url)
        var name = path.basename(req.url, path.extname(req.url))

        sass.render({
            file:        path.join(pub, dir, name+'.scss'),
            outputStyle: 'compressed'
        }, function (err, result) {
            if (err) {
                log.error(err)
                next()
                return
            }
            res.header('Content-type', 'text/css')
               .send(result.css)
            fs.writeFile(path.join(pub, req.url), result.css, function (err) {
                if (err) log.error(err)
            })
        })
    }
}


function filter(req, res, next) {
    if (/.+\.scss$/.test(req.path)) {
        res.sendStatus(404)
        return
    }
    next()
}


module.exports = {
    serve:  serve,
    filter: filter
}

// end of sass.js

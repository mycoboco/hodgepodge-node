/*
 *  minifies and servers js
 */

'use strict'

const fs = require('fs')
const path = require('path')

const minify = require('minify')


let pub, log


function serve(
    _pub,
    _log = {
        info:    () => {},
        warning: () => {},
        error:   () => {}
    }
) {
    pub = _pub
    log = _log

    return (req, res, next) => {
        const dir = path.dirname(req.url)
        const name = path.basename(req.url).substring(1)    // foo.js from _foo.js

        minify(path.join(pub, dir, `+${name}`), (err, result) => {
            if (err) {
                log.error(err)
                next()
                return
            }
            res.header('Content-type', 'text/javascript')
               .send(result)
            fs.writeFile(path.join(pub, req.url), result, err => {
                err && log.error(err)
            })
        })
    }
}


function filter(req, res, next) {
    if (/(?:.*\/|^)\+[^/]+\.js$/.test(req.path)) {    // blocks +foo.js
        res.sendStatus(404)
        return
    }
    next()
}


module.exports = {
    serve,
    filter
}

// end of minjs.js

/*
 *  compiles and servers scss
 */

const fs = require('fs')
const path = require('path')

const sass = require('node-sass')


let pub, log


function serve(
    _pub = 'public',
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
        const name = path.basename(req.url, path.extname(req.url))
                         .substring(1)    // foo from _foo.css

        sass.render({
            file:        path.join(pub, dir, `+${name}.scss`),
            outputStyle: 'compressed'
        }, (err, result) => {
            if (err) {
                log.error(err)
                next()
                return
            }
            res.header('Content-type', 'text/css')
               .send(result.css)
            fs.writeFile(path.join(pub, req.url), result.css, err => err && log.error(err))
        })
    }
}


function filter(req, res, next) {
    if (/(?:.*\/|^)\+[^/]+\.scss$/.test(req.path)) {    // blocks +foo.scss
        res.sendStatus(404)
        return
    }
    next()
}


module.exports = {
    serve,
    filter
}

// end of sass.js

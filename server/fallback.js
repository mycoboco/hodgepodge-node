/*
 *  404 fallback for web apps on restify
 */

const path = require('path')

const serveStatic = require('serve-static-restify')


// opt = {
//     url:   '/web',
//     root:  path.join(__dirname, 'dist'),
//     final: (req, res, next) => res.send(404),
//     serveStatic: {
//         // see https://www.npmjs.com/package/serve-static-restify
//         // fallthrough always set to true
//     }
// }
// server.get.apply(server, [ /\/web\/?.*/, ...fallback(opt) ])
module.exports = (opt) => {
    opt = {
        url:   '/',
        root:  path.join(__dirname, '..', '..', '..', 'dist'),
        final: (req, res) => res.send(404),
        ...opt
    }

    return [
        (req, res, next) => {
            req.url = req.url.substring(opt.url.length) || '/'
            req.path = () => req.url
            serveStatic(opt.root, {
                ...opt.serveStatic,
                fallthrough: true
            })(req, res, next)
        },
        (req, res, next) => {    // 404 fallback
            req.url = '/'
            serveStatic(opt.root, {
                ...opt.serveStatic,
                fallthrough: true
            })(req, res, next)
        },
        opt.final
    ]
}

// end of fallback.js

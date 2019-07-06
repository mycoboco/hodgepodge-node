/*
 *  wrapper for stream pipes to avoid broken pipe;
 *      see https://github.com/nodejs/node/issues/25335
 */

const domain = require('domain')


module.exports = (rs, ws, err) => {
    const d = domain.create()
    d.on('error', err || (() => {}))
    d.run(() => {
        ws.on('unpipe', () => rs.once('readable', () => rs.destroy()))
        ws.on('error', () => rs.unpipe(ws))
          .on('close', () => rs.unpipe(ws))
        rs.pipe(ws)
    })
}

// end of safePipe.js

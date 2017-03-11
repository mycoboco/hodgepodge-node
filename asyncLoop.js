/*
 *  asynchronous loop for synchronous tasks;
 *      from http://stackoverflow.com/a/4288992
 */

'use strict'


module.exports = function (iter, func, cb) {
    var idx = 0
    var done = false

    var loop = {
        next: function () {
            if (done) return

            if (idx < iter) {
                setImmediate(func.bind(null, loop, idx++))
            } else {
                done = true
                cb()
            }
        },
        break: function () {
            done = true
            cb()
        }
    }

    loop.next()

    return loop
}

// end of asyncLoop.js

/*
 *  recursive fs.watch()
 */

const fs = require('fs')
const path = require('path')
const { inherits } = require('util')
const EventEmitter = require('events')

const async = require('async')


function Emitter() {
    EventEmitter.call(this)
}

inherits(Emitter, EventEmitter)


function watch(dirs, _emitter = new Emitter()) {
    if (typeof dirs === 'string') dirs = [ dirs ]

    const ds = [ ...dirs ]
    const collecteds = []
    let watchers = []
    let synced

    function filter(dirs, cb) {
        const filtereds = [], errors = []

        async.parallelLimit(
            dirs.map(d => (callback => {
                fs.stat(d, (err, stats) => {
                    if (err) {
                        _emitter.emit('error', err)
                        return callback()
                    }

                    if (stats.isDirectory() && !stats.isSymbolicLink()) filtereds.push(d)
                    callback()
                })
            })),
            10,
            () => cb(filtereds)
        )
    }

    function scan(dirs, cb) {
        if (dirs.length === 0) return cb()

        const d = dirs.pop()
        collecteds.push(d)

        fs.readdir(d, (err, files) => {
            if (err) {
                _emitter.emit('error', err)
                return scan(dirs, cb)
            }

            filter(files.map(f => path.join(d, f)), filtereds => {
                Array.prototype.push.apply(dirs, filtereds)
                scan(dirs, cb)
            })
        })
    }

    _emitter.sync = () => {
        if (synced || !watchers) return

        watchers.forEach(w => w.close())
        watchers = null
        watch(dirs, _emitter)
    }

    filter(ds, filtereds => {
        scan(filtereds, () => {
            if (!watchers) return

            collecteds.forEach(d => {
                watchers.push(
                    fs.watch(d)
                        .on('error', () => _emitter.emit('error'))
                        .on('change', () => {
                            synced = false
                            _emitter.emit('change')
                        })
                )
            })
            synced = true
        })
    })

    return _emitter
}


module.exports = watch

// end of recursiveWatch.js

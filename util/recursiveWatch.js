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


function watch(dirs, opts = {}, _emitter = new Emitter()) {
    if (typeof dirs === 'string') dirs = [ dirs ]

    const ds = [ ...dirs ]
    const collecteds = []
    let watchers = []
    let synced

    function filter(dirs, opts, cb) {
        const filtereds = [], errors = []

        async.parallelLimit(
            dirs.map(d => (callback => {
                fs.stat(d, (err, stats) => {
                    if (err) {
                        _emitter.emit('error', err)
                        return callback()
                    }

                    const n = path.basename(d)
                    if (stats.isDirectory() && !stats.isSymbolicLink() &&
                        (!opts.ignoreHiddenDirs || n[0] !== '.')) filtereds.push(d)
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

            filter(files.map(f => path.join(d, f)), opts, filtereds => {
                Array.prototype.push.apply(dirs, filtereds)
                scan(dirs, cb)
            })
        })
    }

    _emitter.sync = () => {
        if (synced || !watchers) return

        watchers.forEach(w => w.close())
        watchers = null
        watch(dirs, opts, _emitter)
    }

    filter(ds, { ...opts, ignoreHiddenDirs: false }, filtereds => {
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


!true && !function () {
    watch('test', { ignoreHiddenDirs: true })
        .on('change', () => console.log('changed'))
        .on('error', err => console.log(err || 'error'))
}()

// end of recursiveWatch.js

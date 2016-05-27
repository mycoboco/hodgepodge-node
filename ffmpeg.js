/*
 *  ffmpeg driver
 */

'use strict'

var os = require('os')
var path = require('path')
var spawn = require('child_process').spawn

var defaults = require('defaults')


var dir, log


function init(_dir, _log) {
    dir = _dir || '/usr/local/bin'
    log = _log
}


function secsFromString(s) {
    var t = /([0-9]+):([0-9]+):([0-9\.]+)/.exec(s)

    if (t) return +t[1]*60*60 + +t[2]*60 + +t[3]
}


function probe(ps) {
    ps = (Array.isArray(ps))? ps: [ ps ]

    ps = ps.map(function (p) {
        return new Promise(function (resolve, reject) {
            var ffprobe, opts = [
                '-select_streams', 'v',
                '-show_streams',
                p
            ]
            var stdout = '', stderr = '', info = {}

            ffprobe = spawn(path.join(dir, 'ffprobe'), opts)
            ffprobe.on('exit', function (code, signal) {
                var nframe = /nb_frames=([0-9]+)/,
                    width = /[^_]width=([0-9]+)/,
                    height = /[^_]height=([0-9]+)/,
                    dar = /display_aspect_ratio=([0-9]+:[0-9]+)/,
                    fps = /,\s*([0-9.]+) fps/,
                    duration = /Duration: ([0-9]+:[0-9]+:[0-9\.]+)/,
                    bitrate = /bitrate: ([0-9]+) kb\/s/,
                    date = /date\s*:\s*(\d{4}-\d{2}-\d{2}[T| ]\d{2}:\d{2}:\d{2}(?:\+\d+))/,
                    creationTime = /creation_time\s*:\s*(\d{4}-\d{2}-\d{2}[T| ]\d{2}:\d{2}:\d{2})/

                if (code === null || signal) {
                    reject(new Error('failed to probe: '+p))
                    return
                }

                nframe = nframe.exec(stdout)
                if (nframe) info.nframe = +nframe[1]

                width = width.exec(stdout)
                if (width) info.width = +width[1]
                height = height.exec(stdout)
                if (height) info.height = +height[1]

                dar = dar.exec(stdout)
                if (dar) info.dar = dar[1]

                fps = fps.exec(stderr)
                if (fps) info.fps = +fps[1]

                duration = duration.exec(stderr)
                if (duration) info.duration = secsFromString(duration[1])

                bitrate = bitrate.exec(stderr)
                if (bitrate) info.bitrate = +bitrate[1]

                date = date.exec(stderr)
                if (date) {
                    info.recordedAt = new Date(date[1])
                } else {
                    creationTime = creationTime.exec(stderr)
                    if (creationTime) info.recordedAt = new Date(creationTime[1]+'Z')
                }

                resolve(info)
            }).on('error', function (err) {
                reject(err)
            })

            ffprobe.stdout.on('data', function (data) {
                stdout += data.toString()
            })

            ffprobe.stderr.on('data', function (data) {
                stderr += data.toString()
            })
        })
    })

    return Promise.all(ps)
}


function drive(t, opts, progress) {
    var ffmpeg

    opts.push('-y', t)

    return new Promise(function (resolve, reject) {
        ffmpeg = spawn(path.join(dir, 'ffmpeg'), opts)
        ffmpeg.on('exit', function (code, signal) {
            if (code === null || signal) {
                reject(new Error('failed to process video with options: '+opts))
                return
            }

            resolve(t)
        }).on('error', function (err) {
            reject(err)
        })

        progress && ffmpeg.stderr.on('data', function (data) {
            var prog = /time=([0-9]+:[0-9]+:[0-9\.]+)/

            prog = prog.exec(data.toString())
            if (prog) progress(secsFromString(prog[1]))
        })
    })
}


function constructOpts(_opt, accepts, cmds) {
    var opt = {}, opts = []

    accepts.forEach(function (key) {
        if (typeof _opt[key] !== 'undefined') opt[key] = _opt[key]
        delete _opt[key]
    })
    Object.keys(_opt).forEach(function (key) {
        if (log) log.warning('unsupported option: '+key)
    })

    if (opt.trims && opt.trims[0] >= 0 && opt.trims[1] > 0) {
        opts.push('-ss', opt.trims[0], '-to', opt.trims[1])
    }
    if (opt.resetRotate) opts.push('-metadata:s:v:0', 'rotate=0')
    if (opt.fastStart) opts.push('-movflags', '+faststart')
    if (opt.fps) opts.push('-r', opt.fps)
    opts = opts.concat(cmds)
    if (opt.bitrates && opt.bitrates.length === 2) {
        opts.push('-b:v', opt.bitrates[0], '-bt', opt.bitrates[1])
    }
    if (opt.resolution) opts.push('-s', opt.resolution)
    if (opt.mute) opts.push('-an')
    else opts.push('-acodec', 'copy')

    return opts
}


function progressHandler(s, e, duration, cb) {
    return function (prog) {
        s = (s && s > 0)? s: 0
        e = (e && e > 0)? Math.min(e, duration): duration
        cb(Math.min(prog / (e-s), 1))
    }
}


function copy(s, t, opt, progress) {
    var trims, opts
    var accepts = [ 'mute', 'resetRotate', 'fastStart', 'trims' ]

    if (Array.isArray(s)) s = s[0]

    opt = defaults(opt, {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        trims:       [ -1, -1 ]
    })

    trims = opt.trims
    opts = [ '-i', s ].concat(constructOpts(opt, accepts, [ '-vcodec', 'copy' ]))

    if (progress) {
        return new Promise(function (resolve, reject) {
            probe(s)
            .then(function (info) {
                return drive(t, opts, progressHandler(trims && trims[0], trims && trims[1],
                                                      info[0].duration, progress))
            })
            .catch(reject)
        })
    } else {
        return drive(t, opts)
    }
}


function compress(s, t, opt, progress) {
    var trims, opts
    var accepts = [ 'mute', 'resolution', 'fps', 'resetRotate', 'fastStart', 'trims', 'bitrates' ]

    if (Array.isArray(s)) s = s[0]

    opt = defaults(opt, {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        trims:       [ -1, -1 ],
        bitrates:    [ '4M', '6M' ]
    })

    trims = opt.trims
    opts = [ '-i', s ].concat(constructOpts(opt, accepts, [
        '-vcodec', 'libx264',
        '-vprofile', 'high'
    ]))

    if (progress) {
        return new Promise(function (resolve, reject) {
            probe(s)
            .then(function (info) {
                return drive(t, opts, progressHandler(trims && trims[0], trims && trims[1],
                                                      info[0].duration, progress))
            })
            .catch(reject)
        })
    } else {
        return drive(t, opts)
    }
}


module.exports = {
    init:     init,
    probe:    probe,
    compress: compress,
    copy:     copy
}

// end of ffmpeg.js

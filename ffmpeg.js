/*
 *  ffmpeg driver
 */

'use strict'

var os = require('os')
var path = require('path')
var spawn = require('child_process').spawn


var dir


function init(_dir) {
    dir = _dir || '/usr/local/bin'
}


function probe(p, cb) {
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
            duration = /Duration: ([0-9]+):([0-9]+):([0-9\.]+)/,
            bitrate = /bitrate: ([0-9]+) kb\/s/,
            date = /date\s*:\s*(\d{4}-\d{2}-\d{2}[T| ]\d{2}:\d{2}:\d{2}(?:\+\d+))/,
            creationTime = /creation_time\s*:\s*(\d{4}-\d{2}-\d{2}[T| ]\d{2}:\d{2}:\d{2})/

        if (code === null || signal) {
            cb(new Error('failed to probe: '+p))
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
        if (duration) info.duration = +duration[1]*60*60 + +duration[2]*60 + +duration[3]

        bitrate = bitrate.exec(stderr)
        if (bitrate) info.bitrate = +bitrate[1]

        date = date.exec(stderr)
        if (date) {
            info.recordedAt = new Date(date[1])
        } else {
            creationTime = creationTime.exec(stderr)
            if (creationTime) info.recordedAt = new Date(creatimTime[1])
        }

        cb(null, info)
    }).on('error', function (err) {
        cb(err)
    })

    ffprobe.stdout.on('data', function (data) {
        stdout += data.toString()
    })

    ffprobe.stderr.on('data', function (data) {
        stderr += data.toString()
    })
}


module.exports = function () {
    return {
        init:  init,
        probe: probe
    }
}

// end of ffmpeg.js

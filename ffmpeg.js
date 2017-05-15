/*
 *  ffmpeg driver
 */

'use strict'

var fs = require('fs')
var os = require('os')
var path = require('path')
var spawn = require('child_process').spawn
var execf = require('child_process').execFile

var async = require('async')
var defaults = require('defaults')


var dir, log
var temps = []
var ncpu = os.cpus().length


function init(_dir, _log) {
    dir = _dir || '/usr/local/bin'
    log = _log
}


function secsFromString(s) {
    var t = /([0-9]+):([0-9]+):([0-9\.]+)/.exec(s)

    if (t) return +t[1]*60*60 + +t[2]*60 + +t[3]
}


function frame(p, trims, cb) {
    var opts

    if (typeof trims === 'function') {
        cb = trims
        trims = null
    }

    opts = [ '-nostats' ]
    if (trims && trims[0] >= 0) opts = opts.concat([ '-ss', trims[0] ])
    opts = opts.concat([ '-i', p ])
    if (trims && trims[1] > 0) opts = opts.concat([ '-t', trims[1]-trims[0] ])
    opts = opts.concat([
        '-vcodec', 'copy',
        '-f', 'rawvideo',
        '-y', '/dev/null'
    ])

    execf(path.join(dir, 'ffmpeg'), opts, function (err, stdout, stderr) {
        var nframe = /frame=\s*([0-9]+)/

        if (err) {
            cb(err)
            return
        }

        nframe = nframe.exec(stderr)
        if (nframe) nframe = +nframe[1]
        cb(null, nframe)
    })
}


function probe(ps) {
    ps = (Array.isArray(ps))? ps: [ ps ]

    ps = ps.map(function (p) {
        return new Promise(function (resolve, reject) {
            var opts = [
                '-probesize', '2147483647',
                '-analyzeduration', '2147483647',
                '-select_streams', 'v',
                '-show_streams',
                p
            ]
            var info = {}

            execf(path.join(dir, 'ffprobe'), opts, function (err, stdout, stderr) {
                var nframe = /nb_frames=([0-9]+)/,
                    width = /[^_]width=([0-9]+)/,
                    height = /[^_]height=([0-9]+)/,
                    dar = /display_aspect_ratio=([0-9]+:[0-9]+)/,
                    fps = /,\s*([0-9.]+) fps/,
                    duration = /Duration: ([0-9]+:[0-9]+:[0-9\.]+)/,
                    bitrate = /bitrate: ([0-9]+) kb\/s/,
                    date = /date\s*:\s*(\d{4}-\d{2}-\d{2}[T| ]\d{2}:\d{2}:\d{2}(?:\+\d+))/,
                    creationTime = /creation_time\s*:\s*(\d{4}-\d{2}-\d{2}[T| ]\d{2}:\d{2}:\d{2})/

                if (err) {
                    reject(err)
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

                if (!isFinite(info.nframe)) {    // nframe required
                    frame(p, function (err, f) {
                        if (err) {
                            reject(err)
                            return
                        }

                        info.nframe = f
                        resolve(info)
                    })
                } else {
                    resolve(info)
                }
            })
        })
    })

    return Promise.all(ps)
}


function drive(t, opts, progress) {
    var ffmpeg

    opts = [
        '-probesize', '2147483647',
        '-analyzeduration', '2147483647'
    ].concat(opts)
    opts.push('-y', '--', t)

    return new Promise(function (resolve, reject) {
        ffmpeg = spawn(path.join(dir, 'ffmpeg'), opts, {
            stdio: (progress)? [ 'ignore', 'ignore', 'pipe' ]:
                               'ignore'    // to avoid hanging
        })
        ffmpeg.on('exit', function (code, signal) {
            if (code !== 0 || signal) {
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
            prog && progress(secsFromString(prog[1]))
        })
    })
}


function constructOpts(input, _opt, accepts, cmds) {
    var opt = {}, opts = []

    accepts.forEach(function (key) {
        if (typeof _opt[key] !== 'undefined') opt[key] = _opt[key]
        delete _opt[key]
    })
    Object.keys(_opt).forEach(function (key) {
        log && log.warning('unsupported option: '+key)
    })

    if (opt.trims && opt.trims[0] >= 0) opts.push('-ss', opt.trims[0])
    opts = opts.concat(input)
    if (opt.trims && opt.trims[1] > 0) {
        opts.push('-t', (opt.trims[1]-opt.trims[0]) / (opt.playrate || 1))
    }
    if (opt.resetRotate) opts.push('-metadata:s:v:0', 'rotate=0')
    if (opt.fastStart) opts.push('-movflags', '+faststart')
    if (opt.fps) opts.push('-r', opt.fps)
    // opt.playrate goes into cmds
    if (cmds) opts = opts.concat(cmds)
    if (isFinite(+opt.crf)) opts.push('-crf', opt.crf)
    if (isFinite(+opt.vbv)) opts.push('-maxrate', +opt.vbv+'M', '-bufsize', (+opt.vbv*2)+'M')

    if (opt.quality) opts.push('-q:v', ''+Math.max(2, Math.min(opt.quality, 31)))
    if (opt.resolution) opts.push('-s', opt.resolution)
    if (typeof opt.mute === 'boolean') {
        if (opt.mute) opts.push('-an')
        else opts.push('-acodec', 'copy')
    }

    return opts
}


function progressHandler(s, e, duration, cb) {
    return function (prog) {
        s = (s && s > 0)? s: 0
        e = (e && e > 0)? Math.min(e, duration): duration
        typeof cb === 'function' && cb(Math.min(prog / (e-s), 1))
    }
}


function copy(s, t, opt, progress) {
    var trims, opts
    var accepts = [ 'mute', 'resetRotate', 'fastStart', 'trims' ]

    if (Array.isArray(s)) s = s[0]

    opt = defaults(opt, {
        mute:        false,
        resetRotate: true,
        fastStart:   true
    })

    trims = opt.trims
    opts = constructOpts([ '-i', s ], opt, accepts, [ '-vcodec', 'copy' ])

    if (progress) {
        return new Promise(function (resolve, reject) {
            probe(s)
            .then(function (info) {
                drive(t, opts, progressHandler(trims && trims[0], trims && trims[1],
                                               info[0].duration, progress))
                .then(resolve)
                .catch(reject)
            })
            .catch(reject)
        })
    } else {
        return drive(t, opts)
    }
}


function compress(s, t, opt, progress) {
    var trims, opts
    var accepts = [ 'mute', 'resolution', 'fps', 'resetRotate', 'fastStart', 'trims', 'crf',
                    'vbv' ]

    if (Array.isArray(s)) s = s[0]

    opt = defaults(opt, {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26
    })

    trims = opt.trims
    opts = constructOpts([ '-i', s ], opt, accepts, [
        '-vcodec', 'libx264'
    ])

    if (progress) {
        return new Promise(function (resolve, reject) {
            probe(s)
            .then(function (info) {
                drive(t, opts, progressHandler(trims && trims[0], trims && trims[1],
                                               info[0].duration, progress))
                .then(resolve)
                .catch(reject)
            })
            .catch(reject)
        })
    } else {
        return drive(t, opts)
    }
}


function clean() {
    temps.forEach(function (temp) {
        fs.unlink(temp, function () {})
    })
}


function merge(ss, t, opt, progress) {
    var opts
    var accepts = [ 'mute', 'resetRotate', 'fastStart', 'unsafe' ]
    var list = ''
    var listFile = path.join(os.tmpdir(), process.pid+'-'+(Math.floor(Math.random()*1000000)))

    temps.push(listFile)
    opt = defaults(opt, {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        unsafe:      false
    })

    ss.forEach(function (s) {
        list += 'file '+s+'\n'
    })

    return new Promise(function (resolve, reject) {
        fs.writeFile(listFile, list, function (err) {
            if (err) return Promise.reject(err)

            opts = constructOpts([
                '-f',    'concat',
                '-safe', (opt.unsafe)? 0: 1,
                '-i',    listFile
            ], opt, accepts, [ '-c', 'copy' ])

            if (progress) {
                probe(ss)
                .then(function (infos) {
                    var duration = 0

                    infos.forEach(function (info) {
                        duration += info.duration
                    })
                    drive(t, opts, progressHandler(null, null, duration, progress))
                    .then(function (t) {
                        clean()
                        resolve(t)
                    })
                    .catch(function (err) {
                        clean()
                        reject(err)
                    })
                })
                .catch(reject)
            } else {
                drive(t, opts)
                .then(function (t) {
                    clean()
                    resolve(t)
                })
                .catch(function (err) {
                    clean()
                    reject(err)
                })
            }
        })
    })
}


function playrate(s, t, opt, progress) {
    var trims, playrate, opts
    var accepts = [ 'resolution', 'fps', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv',
                    'playrate' ]

    if (Array.isArray(s)) s = s[0]

    opt = defaults(opt, {
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        playrate:    4
    })

    playrate = opt.playrate
    trims = opt.trims
    opts = constructOpts([ '-i', s ], opt, accepts,
                         [ '-vf', 'setpts='+(1/opt.playrate)+'*PTS', '-an' ])

    if (progress) {
        return new Promise(function (resolve, reject) {
            probe(s)
            .then(function (info) {
                drive(t, opts, progressHandler((trims && trims[0]) / playrate,
                                               (trims && trims[1]) / playrate,
                                               info[0].duration / playrate, progress))
                .then(resolve)
                .catch(reject)
            })
            .catch(reject)
        })
    } else {
        return drive(t, opts)
    }
}


function thumbnail(s, t, opt) {
    var mapper
    var accepts = [ 'resolution', 'trims', 'quality', 'mapper' ]
    var funcs = []

    var tname = function (t, i) {
        var dir = path.dirname(t),
            ext = path.extname(t),
            base = path.basename(t, ext)

        return path.join(dir, base+'-'+i+ext)
    }

    if (Array.isArray(s)) s = s[0]

    opt = defaults(opt, {
        thumbnails: [ 0 ]
    })

    if (typeof opt.thumbnails === 'number') {
        opt.thumbnails = [ opt.thumbnails ]
        tname = function (t) { return t }    // overrided
    }
    mapper = opt.mapper || function (i) { return i }

    return new Promise(function (resolve, reject) {
        probe(s)
        .then(function (info) {
            for (var i = 0; i < opt.thumbnails.length; i++) {
                !function (i) {
                    var _opt = Object.assign({}, opt), opts

                    if (_opt.thumbnails[i] >= info[0].duration ||
                        Math.abs(info[0].duration - _opt.thumbnails[i]) < 1) {
                        delete _opt.thumbnails
                        opts = constructOpts([ '-i', s ], _opt, accepts,
                                             [ '-vf', 'select=\'eq(n,'+(info[0].nframe-1)+')\'',
                                               '-vframes', '1' ])
                    } else {
                        _opt.trims = [ Math.floor(_opt.thumbnails[i]), -1 ]
                        delete _opt.thumbnails
                        opts = constructOpts([ '-i', s ], _opt, accepts, [ '-vframes', '1' ])
                    }

                    funcs.push(function (callback) {
                        drive(tname(t, mapper(i)), opts)
                        .then(function (t) { callback(null, t) })
                        .catch(callback)
                    })
                }(i)
            }

            async.parallelLimit(funcs, ncpu, function (err, results) {
                if (err) reject(err)
                else resolve(results)
            })
        })
        .catch(reject)
    })
}


function preview(s, t, opt) {
    var height, number, fps, opts
    var accepts = [ 'trims', 'number', 'fps', 'height', 'quality' ]

    if (Array.isArray(s)) s = s[0]

    height = opt.height || 120
    if (typeof opt.fps === 'number') fps = opt.fps
    else number = opt.number || 100

    return new Promise(function (resolve, reject) {
        probe(s)
        .then(function (info) {
            var perform = function (nframe) {
                if (typeof number === 'number') {
                    fps = Math.floor(nframe / number)
                    if (fps === 0) fps = 1, number = nframe
                    opts = constructOpts([ '-i', s ], opt, accepts,
                                         [ '-frames', '1',
                                           '-vf', 'select=not(mod(n\\,'+fps+')),scale=-1:'+height+
                                                      ',tile='+number+'x1' ])
                } else {
                    nframe = Math.min(((opt.trims && opt.trims[1] > 0)?
                                           opt.trims[1]: info[0].duration),
                                      info[0].duration)
                    if (opt.trims && opt.trims[0] >= 0) nframe -= opt.trims[0]
                    number = Math.max(1, Math.floor(nframe / fps))
                    opts = constructOpts([ '-i', s ], opt, accepts,
                                         [ '-frames', '1',
                                           '-vf', 'fps=1/'+fps+',scale=-1:'+height+',tile='+number+
                                                      'x1' ])
                }

                drive(t, opts)
                .then(resolve)
                .catch(reject)
            }

            if (typeof number === 'number' && opt.trims &&
                (opt.trims[0] >= 0 || opt.trims[1] > 0)) {
                frame(s, opt.trims, function (err, f) {    // counts # of frames of trimmed one
                    if (err) {
                        reject(err)
                        return
                    }

                    perform(f)
                })
            } else {
                perform(info[0].nframe)
            }
        })
        .catch(reject)
    })
}


function watermark(s, o, t, opt, progress) {
    var trims, opts, overlay
    var accepts = [ 'mute', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv', 'position',
                    'margins' ]

    opt = defaults(opt, {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        position:    'left top',
        margins:     [ 0, 0 ]
    })

    switch(opt.position) {
        case 'left top':
        case 'top left':
        default:    // considered 'left top'
            overlay = 'overlay='+opt.margins[0]+':'+opt.margins[1]
            break
        case 'right top':
        case 'top right':
            overlay = 'overlay=W-w-'+opt.margins[0]+':'+opt.margins[1]
            break
        case 'left bottom':
        case 'bottom left':
            overlay = 'overlay='+opt.margins[0]+':H-h-'+opt.margins[1]
            break
        case 'right bottom':
        case 'bottom right':
            overlay = 'overlay=W-w-'+opt.margins[0]+':H-h-'+opt.margins[1]
            break
        case 'center':    // no margins support
            overlay = 'overlay=(W-w)/2:(H-h)/2'
            break
    }

    trims = opt.trims
    opts = constructOpts([ '-i', s, '-i', o ], opt, accepts, [
        '-filter_complex', overlay
    ])

    if (progress) {
        return new Promise(function (resolve, reject) {
            probe(s)
            .then(function (info) {
                drive(t, opts, progressHandler(trims && trims[0], trims && trims[1],
                                               info[0].duration, progress))
                .then(resolve)
                .catch(reject)
            })
            .catch(reject)
        })
    } else {
        return drive(t, opts)
    }
}


function vidstab(s, t, opt, progress) {
    var trims, detect, opts
    var accepts = [ 'mute', 'resolution', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv',
                    'detect', 'transform', 'unsharp' ]
    var trf = path.join(os.tmpdir(), path.basename(t)+'.trf')

    var opt2str = function (opt) {
        var s = ''

        Object.keys(opt || {}).forEach(function (key) {
            if (key !== 'result' && key !== 'input') s += (':'+key+'='+opt[key])
        })

        return s
    }

    var perform = function (info) {
        return new Promise(function (resolve, reject) {
            var _opts = []

            if (trims && trims[0] >= 0) _opts = _opts.concat([ '-ss', trims[0] ])
            _opts = _opts.concat([ '-i', s ])
            if (trims && trims[1] > 0) _opts = _opts.concat([ '-t', trims[1]-trims[0] ])
            _opts = _opts.concat([
                '-vf', 'vidstabdetect=result='+trf+opt2str(detect),
                '-f', 'null',
            ])

            drive('-', _opts, info && progressHandler(trims && trims[0], trims && trims[1],
                                                      info[0].duration,
                                                      function (p) { progress(p/2) }))
            .then(function () {
                drive(t, opts, info && progressHandler(trims && trims[0], trims && trims[1],
                                                       info[0].duration,
                                                       function (p) { progress(0.5+p/2) }))
                .then(function (t) {
                    clean()
                    resolve(t)
                })
                .catch(function (err) {
                    clean()
                    reject(err)
                })
            })
            .catch(function (err) {
                clean()
                reject(err)
            })
        })
    }

    if (Array.isArray(s)) s = s[0]

    temps.push(trf)
    opt = defaults(opt, {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26
    })

    detect = opt.detect
    trims = opt.trims
    opts = constructOpts([ '-i', s ], opt, accepts, [
        '-vf', 'vidstabtransform=input='+trf+opt2str(opt.transform)+',unsharp='+
                   (opt.unsharp || '5:5:0.8:3:3:0.4'),
        '-vcodec', 'libx264'
    ])

    if (progress) {
        return new Promise(function (resolve, reject) {
            probe(s)
            .then(perform)
            .then(resolve)
            .catch(reject)
        })
    } else {
        return perform()
    }
}


function blur(s, t, opt, progress) {
    var trims, opts
    var accepts = [ 'mute', 'resolution', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv',
                    'type', 'blurs' ]

    var opt2str = function (type, blurs, info) {
        var s = ''

        blurs.forEach(function (bs, idx) {
            var w, h, x, y, x2, y2

            x  = Math.floor((bs[0] <= 1)? bs[0]*info[0].width:  bs[0])
            y  = Math.floor((bs[1] <= 1)? bs[1]*info[0].height: bs[1])
            x2 = Math.floor((bs[2] <= 1)? bs[2]*info[0].width:  bs[2])
            y2 = Math.floor((bs[3] <= 1)? bs[3]*info[0].height: bs[3])
            w = Math.min(x2, info[0].width)  - Math.max(0, x)
            h = Math.min(y2, info[0].height) - Math.max(0, y)
            s += '[0:v]crop='+w+':'+h+':'+x+':'+y+','+type+'='+bs[4]+'[b'+idx+'];'
        })
        blurs.forEach(function (bs, idx) {
            var w, h, x, y, x2, y2

            x  = Math.floor((bs[0] <= 1)? bs[0]*info[0].width:  bs[0])
            y  = Math.floor((bs[1] <= 1)? bs[1]*info[0].height: bs[1])
            s += ((idx === 0)? '[0:v]': '[ovr'+(idx-1)+']')+
                     '[b'+idx+']overlay='+x+':'+y+'[ovr'+idx+'];'
        })

        return s.substring(0, s.length-1)
    }

    if (Array.isArray(s)) s = s[0]

    opt = defaults(opt, {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        type:        'boxblur',
        blurs:       [[ 0, 0, 1, 1, 10 ]]
    })

    return new Promise(function (resolve, reject) {
        probe(s)
        .then(function (info) {
            trims = opt.trims
            opts = constructOpts([ '-i', s ], opt, accepts, [
                '-filter_complex', opt2str(opt.type, opt.blurs, info),
                '-map', '[ovr'+(opt.blurs.length-1)+']',
                '-vcodec', 'libx264'
            ])

            drive(t, opts, progressHandler(trims && trims[0], trims && trims[1], info[0].duration,
                                           progress))
            .then(resolve)
            .catch(reject)
        })
        .catch(reject)
    })
}


module.exports = {
    init:      init,
    probe:     probe,
    compress:  compress,
    copy:      copy,
    merge:     merge,
    playrate:  playrate,
    thumbnail: thumbnail,
    preview:   preview,
    watermark: watermark,
    vidstab:   vidstab,
    blur:      blur
}

// end of ffmpeg.js

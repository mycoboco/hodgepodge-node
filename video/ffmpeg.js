/*
 *  ffmpeg driver
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execFile: execf } = require('child_process')

const async = require('async')
const mime = require('mime')


let dir, log
const temps = []
const ncpu = os.cpus().length


function init(_dir, _log = { warning: () => {} }) {
    if (typeof _dir === 'string') {
        _dir = {
            ffmpeg:  _dir,
            ffprobe: _dir
        }
    }
    dir = _dir
    log = _log
}


function secsFromString(s) {
    const t = /([0-9]+):([0-9]+):([0-9\.]+)/.exec(s)
    if (t) return +t[1]*60*60 + +t[2]*60 + +t[3]
}


function frame(p, trims, cb) {
    if (typeof trims === 'function') {
        cb = trims
        trims = null
    }

    const opts = [ '-nostats' ]
    if (trims && trims[0] >= 0) opts.push('-ss', trims[0])
    opts.push('-i', p)
    if (trims && trims[1] > 0) opts.push('-t', trims[1]-trims[0])
    opts.push(
        '-vcodec', 'copy',
        '-f', 'null',
        '-y', '/dev/null'
    )

    let stderr = ''
    const ffmpeg = spawn(path.join(dir.ffmpeg, 'ffmpeg'), opts, {
        stdio: [ 'ignore', 'ignore', 'pipe' ]
    })
    ffmpeg.on('exit', (code, signal) => {
        if (code !== 0 || signal) {
            return cb(new Error(`failed to get frame # with options: ${opts}`))
        }

        let nframe = /frame=\s*([0-9]+)/
        nframe = nframe.exec(stderr)
        if (nframe) nframe = +nframe[1]
        cb(null, nframe)
    })
    .on('error', cb)
    ffmpeg.stderr.on('data', data => {
        stderr += data
        if (stderr.indexOf('frame=') < 0) {
            stderr = stderr.substring(stderr.lastIndexOf('\n') + 1)
        }
    })
}


function probe(ps) {
    ps = (Array.isArray(ps))? ps: [ ps ]

    ps = ps.map(p => {
        return new Promise((resolve, reject) => {
            const info = {}

            async.parallel([
                callback => {
                    const opts = [
                        '-probesize', '2147483647',
                        '-analyzeduration', '2147483647',
                        '-select_streams', 'v',
                        '-show_streams',
                        p
                    ]

                    execf(path.join(dir.ffprobe, 'ffprobe'), opts, (err, stdout, stderr) => {
                        if (err) return callback(err)

                        const nframe = /nb_frames=([0-9]+)/.exec(stdout)
                        if (nframe) info.nframe = +nframe[1]

                        const width = /[^_]width=([0-9]+)/.exec(stdout)
                        if (width) info.width = +width[1]
                        const height = /[^_]height=([0-9]+)/.exec(stdout)
                        if (height) info.height = +height[1]

                        const dar = /display_aspect_ratio=([0-9]+:[0-9]+)/.exec(stdout)
                        if (dar) info.dar = dar[1]

                        const fps = /,\s*([0-9.]+) fps/.exec(stderr)
                        if (fps) info.fps = +fps[1]

                        const duration = /Duration: ([0-9]+:[0-9]+:[0-9\.]+)/.exec(stderr)
                        if (duration) info.duration = secsFromString(duration[1])

                        const bitrate = /bitrate: ([0-9]+) kb\/s/.exec(stderr)
                        if (bitrate) info.bitrate = +bitrate[1]

                        const date =
                            /date\s*:\s*(\d{4}-\d{2}-\d{2}[T| ]\d{2}:\d{2}:\d{2}(?:\+\d+))/
                            .exec(stderr)
                        if (date) {
                            info.recordedAt = new Date(date[1])
                        } else {
                            const creationTime = new RegExp('creation_time\\s*:\\s*'+
                                                            '(\\d{4}-\\d{2}-\\d{2}[T| ]'+
                                                            '\\d{2}:\\d{2}:\\d{2})').exec(stderr)
                            if (creationTime) info.recordedAt = new Date(`${creationTime[1]}Z`)
                        }

                        const rotate = /rotate\s*:\s*([0-9]+)/.exec(stderr)
                        if (rotate) {
                            info.rotate = +rotate[1]
                            if (info.rotate === 90 || info.rotate === 270) {
                                info.corrected = {
                                    width:  info.height,
                                    height: info.width
                                }
                            }
                        }

                        // nframe required for videos
                        if ((mime.getType(p) || '').indexOf('video/') === 0 &&
                            !isFinite(info.nframe)) {
                            frame(p, (err, f) => {
                                if (err) return callback(err)

                                info.nframe = f
                                callback()
                            })
                        } else {
                            callback()
                        }
                    })
                },
                callback => {
                    const opts = [
                        '-probesize', '2147483647',
                        '-analyzeduration', '2147483647',
                        '-select_streams', 'a',
                        '-show_streams',
                        p
                    ]

                    execf(path.join(dir.ffprobe, 'ffprobe'), opts, (err, stdout, stderr) => {
                        if (err) return callback(err)

                        let audio = /\[STREAM\]\s+index=/.exec(stdout)
                        if (audio) info.audio = true

                        callback()
                    })
                }
            ], err => {
                if (err) return reject(err)

                resolve(info)
            })
        })
    })

    return Promise.all(ps)
}


function drive(t, opts, progress) {
    opts = [
        '-probesize', '2147483647',
        '-analyzeduration', '2147483647',
        ...opts,
        '-y',
        '--',
        t
    ]

    return new Promise((resolve, reject) => {
        const ffmpeg = spawn(path.join(dir.ffmpeg, 'ffmpeg'), opts, {
            stdio: (progress)? [ 'ignore', 'ignore', 'pipe' ]:
                               'ignore'    // to avoid hanging
        })
        ffmpeg.on('exit', (code, signal) => {
            if (code !== 0 || signal) {
                return reject(new Error(`failed to process video with options: ${opts}`))
            }

            resolve(t)
        })
        .on('error', err => {
            reject(err)
        })

        progress && ffmpeg.stderr.on('data', data => {
            const prog = /time=([0-9]+:[0-9]+:[0-9\.]+)/.exec(data.toString())
            prog && progress(secsFromString(prog[1]))
        })
    })
}


function constructOpts(input, _opt, accepts, cmds) {
    const opt = {}
    let opts = []

    accepts.forEach(key => {
        if (typeof _opt[key] !== 'undefined') opt[key] = _opt[key]
        delete _opt[key]
    })
    Object.keys(_opt).forEach(key => log.warning(`unsupported option: ${key}`))

    if (opt.trims && opt.trims[0] >= 0) opts.push('-ss', opt.trims[0])
    opts = [ ...opts, ...input ]
    if (opt.trims && opt.trims[1] > 0) {
        opts.push('-t', (opt.trims[1]-opt.trims[0]) / (opt.playrate || 1))
    }
    if (opt.keepMetadata) opts.push('-map_metadata', 0)
    if (typeof opt.rotate !== 'number' && opt.resetRotate) opt.rotate = 0
    if (typeof opt.rotate === 'number') opts.push('-metadata:s:v:0', `rotate=${opt.rotate}`)
    if (opt.fastStart) opts.push('-movflags', '+faststart')
    if (opt.fps) opts.push('-r', opt.fps)
    // opt.playrate goes into cmds
    if (cmds) opts = [ ...opts, ...cmds ]
    if (isFinite(+opt.crf)) opts.push('-crf', opt.crf)
    if (isFinite(+opt.vbv)) opts.push('-maxrate', `${+opt.vbv}M`, '-bufsize', `${+opt.vbv*2}M`)

    if (opt.quality) opts.push('-q:v', `${Math.max(2, Math.min(opt.quality, 31))}`)
    if (opt.resolution) opts.push('-s', opt.resolution)
    else if (opt.scale) opts.push('-vf', `scale=${opt.scale}`)
    if (typeof opt.mute === 'boolean') {
        if (opt.mute) opts.push('-an')
        else opts.push('-acodec', 'copy')
    }
    if (opt.createTime) opts.push('-metadata', `creation_time=${opt.createTime.toISOString()}`)

    return opts
}


function progressHandler(s, e, duration, cb) {
    return prog => {
        s = (s && s > 0)? s: 0
        e = (e && e > 0)? Math.min(e, duration): duration
        typeof cb === 'function' && cb(Math.min(prog / (e-s), 1))
    }
}


function copy(s, t, opt, progress) {
    const accepts = [
        'mute', 'rotate', 'resetRotate', 'fastStart', 'trims', 'keepMetadata', 'createTime'
    ]

    if (Array.isArray(s)) s = s[0]

    opt = {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        ...opt
    }

    const trims = opt.trims
    const opts = constructOpts([ '-i', s ], opt, accepts, [ '-vcodec', 'copy' ])

    if (progress) {
        return new Promise((resolve, reject) => {
            probe(s)
            .then(info => {
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
    const accepts = [
        'mute', 'resolution', 'scale', 'fps', 'rotate', 'resetRotate', 'fastStart', 'trims', 'crf',
        'vbv', 'keepMetadata', 'createTime'
    ]

    if (Array.isArray(s)) s = s[0]

    opt = {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        ...opt
    }

    const trims = opt.trims
    const opts = constructOpts([ '-i', s ], opt, accepts, [
        '-vcodec', 'libx264'
    ])

    if (progress) {
        return new Promise((resolve, reject) => {
            probe(s)
            .then(info => {
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
    temps.forEach(temp => fs.unlink(temp, () => {}))
}


function merge(ss, t, opt, progress) {
    const accepts = [ 'mute', 'rotate', 'resetRotate', 'fastStart', 'unsafe', 'createTime' ]

    const listFile = path.join(os.tmpdir(), `${process.pid}-${Math.floor(Math.random()*1000000)}`)
    temps.push(listFile)
    opt = {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        unsafe:      true,
        ...opt
    }

    let list = ''
    ss.forEach(s => list += `file ${s}\n`)

    return new Promise((resolve, reject) => {
        fs.writeFile(listFile, list, err => {
            if (err) return Promise.reject(err)

            const opts = constructOpts([
                '-f',    'concat',
                '-safe', (opt.unsafe)? 0: 1,
                '-i',    listFile
            ], opt, accepts, [ '-c', 'copy' ])

            if (progress) {
                probe(ss)
                .then(infos => {
                    let duration = 0

                    infos.forEach(info => duration += info.duration)
                    drive(t, opts, progressHandler(null, null, duration, progress))
                    .then(t => {
                        clean()
                        resolve(t)
                    })
                    .catch(err => {
                        clean()
                        reject(err)
                    })
                })
                .catch(reject)
            } else {
                drive(t, opts)
                .then(t => {
                    clean()
                    resolve(t)
                })
                .catch(err => {
                    clean()
                    reject(err)
                })
            }
        })
    })
}


function playrate(s, t, opt, progress) {
    const accepts = [
        'resolution', 'scale', 'fps', 'rotate', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv',
        'playrate', 'keepMetadata', 'createTime'
    ]

    if (Array.isArray(s)) s = s[0]

    opt = {
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        playrate:    4,
        ...opt
    }

    const playrate = opt.playrate
    const trims = opt.trims
    const opts = constructOpts([ '-i', s ], opt, accepts,
                               [ '-vf', `setpts=${1/opt.playrate}*PTS`, '-an' ])

    if (progress) {
        return new Promise((resolve, reject) => {
            probe(s)
            .then(info => {
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
    const accepts = [ 'resolution', 'scale', 'trims', 'quality', 'mapper' ]

    function tname(t, i) {
        const dir = path.dirname(t),
              ext = path.extname(t),
              base = path.basename(t, ext)

        return path.join(dir, `${base}-${i}${ext}`)
    }

    if (Array.isArray(s)) s = s[0]

    opt = {
        thumbnails: [ 0 ],
        ...opt
    }

    if (typeof opt.thumbnails === 'number') {
        opt.thumbnails = [ opt.thumbnails ]
        tname = t => t    // overrided
    }
    const mapper = opt.mapper || (i => i)

    return new Promise((resolve, reject) => {
        probe(s)
        .then(info => {
            const funcs = []

            for (let i = 0; i < opt.thumbnails.length; i++) {
                !function (i) {
                    const _opt = { ...opt }
                    let opts

                    if (_opt.thumbnails[i] >= info[0].duration ||
                        Math.abs(info[0].duration - _opt.thumbnails[i]) < 1) {
                        delete _opt.thumbnails
                        opts = constructOpts([ '-i', s ], _opt, accepts,
                                             [ '-vf', `select='eq(n,${info[0].nframe-1})'`,
                                               '-vframes', '1' ])
                    } else {
                        _opt.trims = [ Math.floor(_opt.thumbnails[i]), -1 ]
                        delete _opt.thumbnails
                        opts = constructOpts([ '-i', s ], _opt, accepts, [ '-vframes', '1' ])
                    }

                    funcs.push(callback => {
                        drive(tname(t, mapper(i)), opts)
                        .then(t => callback(null, t))
                        .catch(callback)
                    })
                }(i)
            }

            async.parallelLimit(funcs, ncpu, (err, results) => {
                if (err) reject(err)
                else resolve(results)
            })
        })
        .catch(reject)
    })
}


function preview(s, t, opt) {
    const accepts = [ 'trims', 'number', 'fps', 'height', 'quality', 'blank' ]

    if (Array.isArray(s)) s = s[0]

    const tmp = path.join(os.tmpdir(), `${path.basename(t)}-tmp.mp4`)
    temps.push(tmp)
    const height = opt.height || 120
    let number, fps
    if (typeof opt.fps === 'number') fps = opt.fps
    else number = opt.number || 100

    return new Promise((resolve, reject) => {
        probe(s)
        .then(info => {
            let opts

            function perform(nframe) {
                let blank = Promise.resolve.bind(Promise, null)

                if (typeof number === 'number') {
                    fps = Math.floor(nframe / number)
                    if (fps === 0) {
                        fps = 1
                        if (opt.blank) {
                            blank = (s => {
                                return new Promise((resolve, reject) => {
                                    drive(tmp, constructOpts([
                                        '-i', s,
                                        '-f', 'lavfi',
                                        '-i', `color=s=${info[0].width}x${info[0].height}:d=`+
                                                  Math.ceil(number / info[0].fps)
                                    ], { crf: 18 }, [ 'crf' ], [
                                        '-filter_complex', '[0:v][1]concat'
                                    ]))
                                    .then(resolve)
                                    .catch(reject)
                                })
                            }).bind(null, s)
                            s = tmp
                        } else {
                            number = nframe
                        }
                    }
                    opts = constructOpts([ '-i', s ], opt, accepts, [
                        '-frames', '1',
                        '-vf', `select=not(mod(n\\,${fps})),scale=-1:${height},tile=${number}x1`
                    ])
                } else {
                    nframe = Math.min(((opt.trims && opt.trims[1] > 0)?
                                           opt.trims[1]: info[0].duration),
                                      info[0].duration)
                    if (opt.trims && opt.trims[0] >= 0) nframe -= opt.trims[0]
                    number = Math.max(1, Math.floor(nframe / fps))
                    opts = constructOpts([ '-i', s ], opt, accepts, [
                        '-frames', '1',
                        '-vf', `fps=1/${fps},scale=-1:${height},tile=${number}x1`
                    ])
                }

                blank()
                .then(() => drive(t, opts))
                .then(t => {
                    clean()
                    resolve(t)
                })
                .catch(err => {
                    clean()
                    reject(err)
                })
            }

            if (typeof number === 'number' && opt.trims &&
                (opt.trims[0] >= 0 || opt.trims[1] > 0)) {
                frame(s, opt.trims, (err, f) => {    // counts # of frames of trimmed one
                    if (err) return reject(err)

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
    const accepts = [
        'mute', 'rotate', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv', 'position', 'margins',
        'keepMetadata', 'createTime'
    ]

    opt = {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        position:    'left top',
        margins:     [ 0, 0 ],
        ...opt
    }

    let overlay
    switch(opt.position) {
        case 'left top':
        case 'top left':
        default:    // considered 'left top'
            overlay = `overlay=${opt.margins[0]}:${opt.margins[1]}`
            break
        case 'right top':
        case 'top right':
            overlay = `overlay=W-w-${opt.margins[0]}:${opt.margins[1]}`
            break
        case 'left bottom':
        case 'bottom left':
            overlay = `overlay=${opt.margins[0]}:H-h-${opt.margins[1]}`
            break
        case 'right bottom':
        case 'bottom right':
            overlay = `overlay=W-w-${opt.margins[0]}:H-h-${opt.margins[1]}`
            break
        case 'center':    // no margins support
            overlay = 'overlay=(W-w)/2:(H-h)/2'
            break
    }

    const trims = opt.trims
    const opts = constructOpts([ '-i', s, '-i', o ], opt, accepts, [
        '-filter_complex', overlay
    ])

    if (progress) {
        return new Promise((resolve, reject) => {
            probe(s)
            .then(info => {
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
    const accepts = [
        'mute', 'resolution', 'scale', 'rotate', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv',
        'detect', 'transform', 'unsharp', 'keepMetadata', 'createTime'
    ]

    function opt2str(opt) {
        let s = ''
        Object.keys(opt || {}).forEach(key => {
            if (key !== 'result' && key !== 'input') s += `:${key}=${opt[key]}`
        })

        return s
    }

    if (Array.isArray(s)) s = s[0]

    const trf = path.join(os.tmpdir(), `${path.basename(t)}.trf`)
    temps.push(trf)
    opt = {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        ...opt
    }

    const detect = opt.detect
    const trims = opt.trims
    const opts = constructOpts([ '-i', s ], opt, accepts, [
        '-vf', `vidstabtransform=input=${trf}${opt2str(opt.transform)},unsharp=`+
                   (opt.unsharp || '5:5:0.8:3:3:0.4'),
        '-vcodec', 'libx264'
    ])


    function perform(info) {
        return new Promise((resolve, reject) => {
            const _opts = []
            if (trims && trims[0] >= 0) _opts.push('-ss', trims[0])
            _opts.push('-i', s)
            if (trims && trims[1] > 0) _opts.push('-t', trims[1]-trims[0])
            _opts.push(
                '-vf', `vidstabdetect=result=${trf}${opt2str(detect)}`,
                '-f', 'null',
            )

            drive('-', _opts, info && progressHandler(trims && trims[0], trims && trims[1],
                                                      info[0].duration,
                                                      p => progress(p/2)))
            .then(() => {
                drive(t, opts, info && progressHandler(trims && trims[0], trims && trims[1],
                                                       info[0].duration,
                                                       p => progress(0.5+p/2)))
                .then(t => {
                    clean()
                    resolve(t)
                })
            })
            .catch(err => {
                clean()
                reject(err)
            })
        })
    }

    if (progress) {
        return new Promise((resolve, reject) => {
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
    const accepts = [
        'mute', 'resolution', 'scale', 'rotate', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv',
        'type', 'blurs', 'keepMetadata', 'createTime'
    ]

    function opt2str(type, blurs, info) {
        let s = ''

        blurs.forEach((bs, idx) => {
            const x  = Math.floor((bs[0] <= 1)? bs[0]*info[0].width:  bs[0])
            const y  = Math.floor((bs[1] <= 1)? bs[1]*info[0].height: bs[1])
            const x2 = Math.floor((bs[2] <= 1)? bs[2]*info[0].width:  bs[2])
            const y2 = Math.floor((bs[3] <= 1)? bs[3]*info[0].height: bs[3])
            const w = Math.min(x2, info[0].width)  - Math.max(0, x)
            const h = Math.min(y2, info[0].height) - Math.max(0, y)
            s += `[0:v]crop=${w}:${h}:${x}:${y},${type}=${bs[4]}[b${idx}];`
        })
        blurs.forEach((bs, idx) => {
            const x  = Math.floor((bs[0] <= 1)? bs[0]*info[0].width:  bs[0])
            const y  = Math.floor((bs[1] <= 1)? bs[1]*info[0].height: bs[1])
            s += `${(idx === 0)? '[0:v]': '[ovr${idx-1}]'}`+
                     `[b${idx}]overlay=${x}:${y}[ovr${idx}];`
        })

        return s.substring(0, s.length-1)
    }

    if (Array.isArray(s)) s = s[0]

    opt = {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        type:        'boxblur',
        blurs:       [[ 0, 0, 1, 1, 10 ]],
        ...opt
    }

    return new Promise((resolve, reject) => {
        probe(s)
        .then(info => {
            const trims = opt.trims
            const opts = constructOpts([ '-i', s ], opt, accepts, [
                '-filter_complex', opt2str(opt.type, opt.blurs, info),
                '-map', `[ovr${opt.blurs.length-1}]`,
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


function landscape(s, t, opt, progress) {
    const accepts = [
        'mute', 'resolution', 'rotate', 'resetRotate', 'fastStart', 'trims', 'crf', 'vbv', 'type',
        'blurs', 'keepMetadata', 'createTime'
    ]

    if (Array.isArray(s)) s = s[0]

    opt = {
        mute:        false,
        resetRotate: true,
        fastStart:   true,
        crf:         26,
        resolution:  '1920x1080',
        type:        'blur',
        ...opt
    }

    let w = /^([0-9]+)x([0-9]+)$/i.exec(opt.resolution), h
    if (!w) w = 1920, h = 1080
    else h = +w[2], w = +w[1]

    return new Promise((resolve, reject) => {
        probe(s)
        .then(info => {
            const trims = opt.trims
            const opts = constructOpts([ '-i', s ], opt, accepts, (opt.type === 'blur')? [
                '-lavfi', `[0:v]scale=ih*${w}/${h}:-1,boxblur=luma_radius=min(h\\,w)/20:`+
                          `luma_power=1:chroma_radius=min(cw\\,ch)/20:chroma_power=1[bg];`+
                          `[bg][0:v]overlay=(W-w)/2:(H-h)/2,crop=h=iw*${h}/${w}`
            ]: [
                '-vf', `pad=ih*${w}/${h}:ih:(ow-iw)/2:(oh-ih)/2`+
                           `${(opt.type === 'blur')? '': `:color=${opt.type}`}`
            ])

            drive(t, opts, progressHandler(trims && trims[0], trims && trims[1], info[0].duration,
                                           progress))
            .then(resolve)
            .catch(reject)
        })
        .catch(reject)
    })
}


function amix(s, a, t, opt, progress) {
    const accepts = [ 'volumes', 'keepMetadata', 'createTime' ]

    opt = {
        volumes: [ 1, 0.5 ],
        ...opt
    }

    return new Promise((resolve, reject) => {
        probe([ s, a ])
        .then(infos => {
            let opts

            let mix = `amovie=${a}`
            if (infos[0].duration > infos[1].duration) {
                mix += `:loop=${Math.ceil(infos[0].duration / infos[1].duration)}`
            }
            mix += '[s];'+
                   `[s]volume=${opt.volumes[1]}[a1]`

            if (infos[0].audio) {
                mix += `;[0:a]volume=${opt.volumes[0]}[a0];`+
                        '[a0][a1]amix=duration=shortest[a]'

                opts = constructOpts([ '-i', s ], opt, accepts, [
                    '-filter_complex', mix,
                    '-map', '0:v', '-map', '[a]',
                    '-c:v', 'copy', '-c:a', 'aac',
                ])
            } else {
                opts = constructOpts([ '-i', s ], opt, accepts, [
                    '-filter_complex', mix,
                    '-map', '0:v', '-map', '[a1]',
                    '-c:v', 'copy', '-c:a', 'aac',
                    '-shortest'
                ])
            }

            drive(t, opts, progressHandler(null, null, infos[0].duration, progress))
            .then(resolve)
            .catch(reject)
        })
        .catch(reject)
    })
}


module.exports = {
    init,
    probe,
    copy,
    compress,
    merge,
    playrate,
    thumbnail,
    preview,
    watermark,
    vidstab,
    blur,
    landscape,
    amix
}


!true && !function () {
    const path = require('path')
    const ffmpeg = module.exports
    const test = path.join('.', 'test', 'sample.mp4')
    const watermark = path.join('.', 'test', 'watermark.png')
    const audio = path.join('.', 'test', 'sample.mp3')

    ffmpeg.init('/usr/bin')
    ffmpeg.probe(test)
    .then(infos => console.log(infos))
    .catch(err => console.log(err))

    ffmpeg.copy(test, 'sample-copy.mp4', { rotate: 90 }, p => console.log(`copy: ${p}`))
    .then(t => {
        console.log(t)
        return ffmpeg.compress(test, 'sample-comp.mp4', { crf: 35 },
                               p => console.log(`compress: ${p}`))
    })
    .then(t => {
        console.log(t)
        return ffmpeg.playrate(test, 'sample-rate.mp4', { playrate: 0.5 },
                               p => console.log(`playrate: ${p}`))
    })
    .then(t => {
        console.log(t)
        return ffmpeg.thumbnail(test, 'sample.jpg', { thumbnails: [ 1, 4 ] })
    })
    .then(t => {
        console.log(t)
        return ffmpeg.preview(test, 'sample-prv.jpg', { number: 10 })
    })
    .then(t => {
        console.log(t)
        return ffmpeg.watermark(test, watermark, 'sample-wm.mp4', { margins: [ 10, 10 ] },
                                p => console.log(`watermark: ${p}`))
    })
    /*
        .then(t => {
            console.log(t)
            return ffmpeg.vidstab(test, 'sample-vid.mp4', {}, p => console.log(`vidstab: ${p}`))
        })
    */
    .then(t => {
        console.log(t)
        return ffmpeg.blur(test, 'sample-blur.mp4', { crf: 35 }, p => console.log(`blur: ${p}`))
    })
    .then(t => {
        console.log(t)
        return ffmpeg.landscape('sample-copy.mp4', 'sample-landscape.mp4', {},
                                p => console.log(`landscape: ${p}`))
    })
    .then(t => {
        console.log(t)
        return ffmpeg.amix(test, audio, 'sample-amix.mp4', { volumes: [ 0, 1 ] },
                           p => console.log(`amix: ${p}`))
    })
    .then(t => {
        console.log(t)
        return ffmpeg.merge([ path.resolve('sample-comp.mp4'), path.resolve('sample-blur.mp4') ],
                            'sample-merge.mp4', { crf: 35 }, p => console.log(`merge: ${p}`))
    })
    .then(t => console.log(t))
    .catch(err => console.log(err))
}()

// end of ffmpeg.js

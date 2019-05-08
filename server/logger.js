/*
 *  logger wrapper for winston
 */

// cannot 'use strict' due to arguments.callee

const winston = require('winston')
const colors = require('colors')


// adds global property to trace call stacks
!global.hasOwnProperty('__stack') && Object.defineProperty(global, '__stack', {
    get: function () {
        const orig = Error.prepareStackTrace
        const err = new Error

        Error.prepareStackTrace = (_, stack) => stack
        Error.captureStackTrace(err, arguments.callee)
        const stack = err.stack
        Error.prepareStackTrace = orig

        return stack
    }
})


// adds global property to get line number
!global.hasOwnProperty('__line') && Object.defineProperty(global, '__line', {
    get: function () { return __stack[2].getLineNumber() }
})


// adds global property to get function name
!global.hasOwnProperty('__function') && Object.defineProperty(global, '__function', {
    get: function () { return __stack[2].getFunctionName() }
})


// ?conf = {
//     prefix: 'prefix',
//     level:  'info' || 'warning' || 'error' || 'off',
//     stack:  true || false
// }
function create(conf) {
    conf = {
        prefix: undefined,
        level:  'info',
        stack:  true,
        ...conf
    }

    const colorize = conf.level !== 'off' && process.stdout.isTTY && !conf.json

    function locus(s) {
        // assumes Console used for output
        return (colorize)? s.cyan: `<${s}>`
    }

    const logger = new winston.Logger({
        levels: {
            error:   0,
            warning: 1,
            info:    2
        },
        colors: {
            error:   'red',
            warning: 'yellow',
            info:    'green'
        },
        transports: (conf.level !== 'off')? [
            new winston.transports.Console({
                timestamp: true,
                label:     conf.prefix,
                level:     conf.level,
                colorize,
                json:      !!conf.json
            })
        ]: []
    })

    const info = logger.info
    const warning = logger.warning
    const error = logger.error

    logger.info = function (err) {
        const args = Array.prototype.slice.call(arguments)

        err = err.message || err
        args.push(locus(`${(__function)? `${__function}`: '(anonymous)'}:${__line}`))
        info.apply(logger, args)
    }

    logger.warning = function (err) {
        const args = Array.prototype.slice.call(arguments)

        err = err.message || err
        args.push(locus(`${(__function)? `${__function}`: '(anonymous)'}:${__line}`))
        warning.apply(logger, args)
    }

    logger.error = function (err) {
        if (!err) return

        let stack
        if (conf.stack) stack = err.stack
        err = err.message || err
        err += ((stack)? `\n${stack}`: '')
        const args = Array.prototype.slice.call(arguments)

        args.push(locus(`${(__function)? `${__function}`: '(anonymous)'}:${__line}`))
        error.apply(logger, args)
    }

    return logger
}


module.exports = {
    create
}


!true && !function () {
    const logger = module.exports
    const log = logger.create({
        prefix: 'test',
        level:  'info',
        json:   true
    })

    log.info(new Error('information'))
    log.warning(new Error('warning'))
    log.error(new Error('error'))
}()

// end of logger.js

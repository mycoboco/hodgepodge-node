/*
 *  drops privieges by chaning uid/gid
 */

'use strict'


function dropPrivilege(runAs, log, exit) {
    var nop = function () {}
    log = log || { info: nop, warning: nop, error: nop }
    exit = exit || nop

    if (runAs && runAs.uid && runAs.gid) {
        try {
            log.info('try to run as '+runAs.uid+':'+runAs.gid)
            process.setgid(runAs.gid)
            process.setuid(runAs.uid)
        } catch(err) {
            log.error(err)
            exit()
        }
    } else if (process.getuid() === 0 || process.getgid() === 0) {
        log.warning('server sill run as root!')
    }
}


module.exports = dropPrivilege

// end of dropPrivilege.js

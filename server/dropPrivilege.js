/*
 *  drops privieges by chaning uid/gid
 */


module.exports = (
    runAs,
    log = {
        info:    () => {},
        warning: () => {},
        error:   () => {}
    },
    exit = () => {}
) => {
    if (runAs && runAs.uid && runAs.gid) {
        try {
            log.info(`try to run as ${runAs.uid}:${runAs.gid}`)
            process.setgid(runAs.gid)
            process.setuid(runAs.uid)
        } catch(err) {
            log.error(err)
            exit()
        }
    } else if (process.getuid() === 0 || process.getgid() === 0) {
        log.warning('server will run as root!')
    }
}


!true && !function () {
    const { username: user } = require('os').userInfo()
    const drop = module.exports

    drop({
        uid: user,
        gid: user
    }, {
        info:    console.log.bind(console),
        warning: console.log.bind(console),
        error:   console.log.bind(console)
    })
}()

// end of dropPrivilege.js

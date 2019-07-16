/*
 *  child process manager
 */

const childs = []
const debug = false


function add(child) {
    const handler = () => remove(child)

    debug && console.log(`adding ${child.pid}`)
    childs.push({
        handle: child,
        handler
    })
    child.once('exit', handler)

    return child
}


function remove(child) {
    const i = childs.findIndex(c => c.handle === child)
    if (i < 0) return
    debug && console.log(`removing ${child.pid}`)
    childs.splice(i, 1)

    return child
}


function clean() {
    childs.forEach(c => {
        c.handle.removeListener('exit', c.handler)
        debug && console.log(`killing ${c.handle.pid}`)
        c.handle.kill()    // may be unsafe or not work
    })
}


module.exports = {
    add,
    remove,
    clean
}

// end of childManager.js

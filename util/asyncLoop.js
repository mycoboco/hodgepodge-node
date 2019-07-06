/*
 *  asynchronous loop for synchronous tasks;
 *      from http://stackoverflow.com/a/4288992
 */


module.exports = (iter, func, cb = () => {}) => {
    let idx = 0
    let done = false

    const loop = {
        next: () => {
            if (done) return

            if (idx < iter) {
                setImmediate(func.bind(null, loop, idx++))
            } else {
                done = true
                cb(iter)
            }
        },
        break: () => {
            done = true
            cb(idx - 1)
        }
    }

    loop.next()

    return loop
}


!true && !function () {
    const asyncLoop = module.exports
    asyncLoop(
        12,
        (loop, x) => {
            console.log(x);
            if (x == 10) loop.break()
            else loop.next()
        },
        (idx) => console.log(`done: ${idx}`)
    )
}()

// end of asyncLoop.js

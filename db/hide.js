/*
 *  hides credentials from connection urls
 */


module.exports = (url = '') => {
    return url.replace(
        /([a-z]+:\/\/)?([^:]+)(:.+)?(@.*)/,
        (match, p1 = '', p2 = '', p3 = '', p4 = '') => {
            return `${p1}${p2}${(p3)? ':???': ''}${p4}`
        }
    )
}


!true && !function () {
    const hide = module.exports

    console.log(hide())                                     // empty
    console.log(hide(''))                                   // empty
    console.log(hide('mysql://'))                           // mysql://
    console.log(hide('mysql://foo1!:bar1!@example.com'))    // mysql://foo1!:???@example.com
    console.log(hide('mysql://foo1!@example.com'))          // mysql://foo1!@example.com
    console.log(hide('mysql://:bar1!@example.com'))         // invalid url
    console.log(hide('mysql://example.com'))                // mysql://example.com
    console.log(hide('foo1!:bar1!@example.com'))            // foo1!:???@example.com
    console.log(hide(':bar1!@example.com'))                 // invalid url
    console.log(hide('foo1!@example.com'))                  // foo1!@example.com
    console.log(hide('example.com'))                        // example.com
}()

// end of hide.js

/*
 *  extracts an IP from a HTTP request (for express and restify)
 */

'use strict'


function getReqIp(req) {
    var ip = req.headers['x-forwarded-for'] ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             req.connection.socket.remoteAddress

    ip = (/(?:^|:)((?:[0-9]{1,3}\.){3}[0-9]{1,3})/).exec(ip)

    return ip && ip[1]
}


module.exports = getReqIp

// end of getReqIp.js

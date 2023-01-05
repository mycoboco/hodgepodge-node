/*
 *  extracts an IP from a HTTP request (for express and restify)
 */

module.exports = (req) => {
  let ip = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;

  ip = (/(?:^|:)((?:[0-9]{1,3}\.){3}[0-9]{1,3})/).exec(ip);

  return ip && ip[1];
};

// end of getReqIp.js

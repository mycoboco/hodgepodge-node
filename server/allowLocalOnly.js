/*
 *  allow requests from local only
 */

const ipRangeCheck = require('ip-range-check');
const {getReqIp, ServerError} = require('./');

module.exports = (req, _res, next) => {
  const ip = getReqIp(req);
  if (ipRangeCheck(ip, ['192.168.0.1/24', '127.0.0.1'])) return next();
  next(new ServerError(400, `unauthorized access from ${ip}`));
};

// end of allowLocalOnly.js

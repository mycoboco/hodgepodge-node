/*
 *  allow requests from local only
 */

import ipRangeCheck from 'ip-range-check';
import getReqIp from './getReqIp.js';
import ServerError from './ServerError.js';

export default function _(req, _res, next) {
  const ip = getReqIp(req);
  if (ipRangeCheck(ip, ['192.168.0.1/24', '127.0.0.1'])) return next();
  next(new ServerError(400, `unauthorized access from ${ip}`));
}

// eslint-disable-next-line no-constant-condition
if (false) {
  _(
    {
      connection: {
        remoteAddress: '200.168.0.255',
      },
    },
    null,
    (err) => console.log(err || 'next invoked'),
  );
}

// end of allowLocalOnly.js

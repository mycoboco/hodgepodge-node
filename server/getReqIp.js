/*
 *  extracts an IP from a HTTP request (for express and restify)
 */

export default function _(req) {
  let ip = req?.headers?.['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection.socket?.remoteAddress;

  ip = (/(?:^|:)((?:[0-9]{1,3}\.){3}[0-9]{1,3})/).exec(ip);

  return ip?.[1];
}

// eslint-disable-next-line no-constant-condition
if (false) {
  console.log(
    _({
      headers: {},
      connection: {
        remoteAddress: '192.168.0.255',
      },
    }),
  );
}

// end of getReqIp.js

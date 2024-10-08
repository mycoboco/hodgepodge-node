/*
 *  continues routing only on debug mode
 */

export default function _(debug) {
  if (typeof debug !== 'boolean') {
    debug = (process.env.NODE_ENV !== 'production');
  }

  return (_req, res, next) => {
    if (debug) return next();

    res.send(404);
  };
}

// end of checkDebug.js

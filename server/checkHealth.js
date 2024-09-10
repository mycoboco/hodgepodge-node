/*
 *  handles health checks
 */

export default function _(isToTerminate) {
  return (_req, res) => {
    const terminate = typeof isToTerminate === 'function' ? isToTerminate() : isToTerminate;

    res.send(terminate ? 404 : 200);
  };
}

// eslint-disable-next-line no-constant-condition
if (false) {
  _(() => true)(
    {},
    {
      send: (code) => console.log(`code: ${code}`),
    },
  );
}

// end of checkHealth.js

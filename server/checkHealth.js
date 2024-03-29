/*
 *  handles health checks
 */

module.exports = (isToTerminate) => function(_req, res) {
  const terminate = typeof isToTerminate === 'function' ? isToTerminate() : isToTerminate;

  res.send(terminate ? 404 : 200);
};

// end of checkHealth.js

/*
 *  wrapper for stream pipes to avoid broken pipe;
 *      see https://github.com/nodejs/node/issues/25335
 */

export default (rs, ws, _handler) => {
  const handler = (err) => {
    rs.unpipe(ws);
    ws.end();
    _handler?.(err);
  };

  ws.on('unpipe', () => rs.once('readable', () => rs.destroy()));
  ws.on('error', handler)
    .on('close', () => rs.unpipe(ws));
  rs.on('error', handler);
  rs.pipe(ws);
};

// end of safePipe.js

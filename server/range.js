/*
 *  handles range information from HTTP headers
 */

export function parse(range, stats) {
  const p = (r) => {
    r = /bytes=([0-9]+)-([0-9]+)?/.exec(r);
    if (!r) return null;

    return {
      s: +r[1],
      e: +r[2],
    };
  };

  const r = p(range);
  if (!r) return null;
  if (isNaN(r.e)) r.e = stats.size - 1;
  if (r.s >= stats.size || r.e >= stats.size || r.s > r.e) {
    return new Error(`invalid range request: ${range}`);
  }

  return r;
}

export function header(r, stats) {
  return `bytes ${r.s}-${r.e}/${stats.size}`;
}

// end of range.js

/*
 *  checks request parameters
 */

import {inspect} from 'node:util';

import ServerError from './ServerError.js';

export default function assert(assertion, code, variable, value = assertion) {
  if (!assertion) {
    const err = new ServerError(code, `invalid ${variable}: ${inspect(value)}`);
    throw err;
  }

  return {and: assert};
}

// eslint-disable-next-line no-constant-condition
if (false) {
  assert(null === null, 500, 'null').
    // eslint-disable-next-line use-isnan
    and(NaN === NaN, 500, 'NaN');
}

// end of checkParams.js

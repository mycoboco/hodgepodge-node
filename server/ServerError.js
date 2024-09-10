/*
 *  server errors
 */

export default class ServerError extends Error {
  constructor(code, message) {
    if (!isFinite(code)) {
      message = code;
      code = 500;
    }
    if (message instanceof Error) { // from Error
      message.statusCode = code;
      return message;
    }
    if (isFinite(message.status) && message.url && message.statusText) {
      // from fetch's response
      const {body} = message;
      message = `${message.url} gave status: ${message.status} ` +
        `(${typeof body === 'string' && body ? body : message.statusText})`;
    }
    super(message);
    Error.captureStackTrace(this, ServerError);
    this.statusCode = code;
  }
}

// end of ServerError.js

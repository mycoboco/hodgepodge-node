/*
 *  server errors
 */

class ServerError extends Error {
  constructor(code, message) {
    if (!isFinite(code)) {
      message = code;
      code = 500;
    }
    if (message instanceof Error) { // from Error
      message.statusCode = code;
      return message;
    }
    if (isFinite(message.statusCode) && message.request && message.request.host) {
      // from request's response
      const {body} = message;
      message = `${message.request.host} gave status: ${message.statusCode} ` +
        `(${typeof body === 'string' && body ? body : message.statusMessage})`;
    }
    super(message);
    Error.captureStackTrace(this, ServerError);
    this.statusCode = code;
  }
}

module.exports = ServerError;

// end of ServerError.js

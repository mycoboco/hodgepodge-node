/*
 *  *  server errors
 *   */


class ServerError extends Error {
    constructor(code, message) {
        if (!isFinite(code)) {
            message = code
            code = 500
        }
        if (isFinite(message.statusCode) && message.request && message.request.host) {
            message = `${message.request.host} gave status code: ${message.statusCode}`
        }
        super(message)
        Error.captureStackTrace(this, ServerError)
        this.statusCode = code
    }
}


module.exports = ServerError

// end of ServerError.js

const { AppError } = require('../errors/appErrors');

function errorHandler(err, req, res, next) {
  // Operational custom errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details && { details: err.details })
    });
  }

  // Malformed JSON sent by client in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body'
    });
  }

  // Fallback for unexpected internal bugs
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    success: false,
    error: 'An unexpected internal server error occurred.'
  });
}

module.exports = errorHandler;

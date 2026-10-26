class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class StorageError extends AppError {
  constructor(message = 'Storage failure', details = null) {
    super(message, 500, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  NotFoundError,
  StorageError
};

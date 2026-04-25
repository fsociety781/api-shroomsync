// ============================================
// ShroomSync — Global Error Handler Middleware
// ============================================

const { AppError, ValidationError } = require('../utils/errors');
const ApiResponse = require('../utils/api-response');
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  // Zod validation errors
  if (err.name === 'ZodError') {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return ApiResponse.error(res, 'Validation failed', 400, errors);
  }

  // Custom app errors
  if (err instanceof AppError) {
    if (err instanceof ValidationError && err.errors && err.errors.length > 0) {
      return ApiResponse.error(res, err.message, err.statusCode, err.errors);
    }
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return ApiResponse.error(res, 'A record with this unique value already exists', 409);
  }
  if (err.code === 'P2025') {
    return ApiResponse.error(res, 'Record not found', 404);
  }

  // Unexpected errors
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  }, 'Unhandled Exception');

  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  ApiResponse.error(res, message, 500);
}

module.exports = errorHandler;

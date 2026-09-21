// ============================================
// ShroomSync — Global Error Handler Middleware
// ============================================

const { AppError, ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const ApiResponse = require('../utils/api-response');
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const contextLog = logger.child({
    requestId: req.id || `${Date.now()}-${Math.random()}`,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // ── Zod Validation Errors (Input Validation) ──
  if (err.name === 'ZodError') {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));

    contextLog.warn({ errors }, 'Validation error');
    return ApiResponse.error(res, 'Validation failed - check fields', 400, errors);
  }

  // ── Custom App Errors ──────────────────────────
  if (err instanceof ValidationError) {
    if (err.errors && err.errors.length > 0) {
      contextLog.warn({ errors: err.errors }, err.message);
      return ApiResponse.error(res, err.message, err.statusCode, err.errors);
    }
    contextLog.warn(err.message);
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  if (err instanceof NotFoundError) {
    contextLog.info(err.message);
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  if (err instanceof ConflictError) {
    contextLog.warn(err.message);
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  if (err instanceof AppError) {
    contextLog.error({ errorCode: err.name }, err.message);
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  // ── Prisma Errors ────────────────────────────
  if (err.code === 'P2002') {
    contextLog.warn({ target: err.meta?.target }, 'Unique constraint violation');
    return ApiResponse.error(res, 'Record with this value already exists', 409);
  }

  if (err.code === 'P2025') {
    contextLog.info('Record not found in database');
    return ApiResponse.error(res, 'Record not found', 404);
  }

  if (err.code === 'P2003') {
    contextLog.warn('Foreign key constraint failed');
    return ApiResponse.error(res, 'Invalid reference - related record not found', 400);
  }

  if (err.code === 'P2028') {
    contextLog.error('Database transaction failed');
    return ApiResponse.error(res, 'Operation failed - please try again', 500);
  }

  // ── Unexpected Errors (500) ───────────────────
  contextLog.error({
    errorName: err.name,
    errorStack: err.stack,
    errorMessage: err.message,
  }, 'Unhandled Exception');

  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error - please contact support'
    : err.message;

  ApiResponse.error(res, message, 500);
}

module.exports = errorHandler;

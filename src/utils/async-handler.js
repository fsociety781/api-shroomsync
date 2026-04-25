/**
 * Wrapper for Express async handlers to automatically catch errors
 * and forward them to the next() middleware.
 * Eliminates the need for try/catch blocks in every controller method.
 *
 * @param {Function} fn - Async controller function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

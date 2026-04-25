/**
 * Standardized API response helpers.
 * Ensures consistent response structure across all endpoints.
 */

class ApiResponse {
  /**
   * Send a success response.
   *
   * @param {Object} res - Express response object
   * @param {Object} data - Payload data
   * @param {String} [message] - Optional success message
   * @param {Number} [statusCode=200] - HTTP status code
   */
  static success(res, data, message = undefined, statusCode = 200) {
    res.status(statusCode).json({
      status: 'success',
      ...(message && { message }),
      data,
    });
  }

  /**
   * Send a paginated success response.
   *
   * @param {Object} res - Express response object
   * @param {Array} data - Array of payload items
   * @param {Object} pagination - Pagination metadata {total, limit, offset}
   * @param {Number} [statusCode=200] - HTTP status code
   */
  static paginated(res, data, pagination, statusCode = 200) {
    res.status(statusCode).json({
      status: 'success',
      data,
      pagination,
    });
  }

  /**
   * Send an error response.
   *
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} [statusCode=500] - HTTP status code
   * @param {Array} [errors] - Optional detailed validation errors
   */
  static error(res, message, statusCode = 500, errors = undefined) {
    res.status(statusCode).json({
      status: 'error',
      message,
      ...(errors && { errors }),
    });
  }
}

module.exports = ApiResponse;

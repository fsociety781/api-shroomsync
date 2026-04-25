const { z } = require('zod');
const { ValidationError } = require('../utils/errors');

/**
 * Creates an Express middleware that validates the request
 * against a provided Zod schema.
 *
 * @param {z.AnyZodObject} schema - The Zod schema to validate against
 */
const validate = (schema) => async (req, res, next) => {
  try {
    // Only validate fields that are present in the schema definition
    // Usually schemas just define `body`, `query`, or `params`
    const validatedData = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Update the request with the validated/coerced data
    req.body = validatedData.body || req.body;
    req.query = validatedData.query || req.query;
    req.params = validatedData.params || req.params;

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join('.').replace(/^body\.|^query\.|^params\./, ''),
        message: err.message,
      }));
      next(new ValidationError('Validation failed', errors));
    } else {
      next(error);
    }
  }
};

module.exports = { validate };

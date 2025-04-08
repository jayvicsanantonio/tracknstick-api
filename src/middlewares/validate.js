const { validationResult } = require('express-validator');

// Middleware function factory that takes validation rules as input
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validation rules concurrently
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      // No errors, proceed to the next middleware/handler
      return next();
    }

    // Errors found, format them and send a 400 response
    const extractedErrors = [];
    errors.array().map((err) => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(400).json({
      errors: extractedErrors,
    });
  };
};

module.exports = validate;

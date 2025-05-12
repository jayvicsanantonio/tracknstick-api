const { validationResult } = require('express-validator');

const validate = (validations) => (req, res, next) =>
  Promise.all(validations.map((validation) => validation.run(req))).then(() => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const validationError = new Error('Input validation failed');
    validationError.statusCode = 400;
    validationError.status = 'fail';
    validationError.isOperational = true;
    validationError.errorCode = 'VALIDATION_ERROR';
    validationError.details = errors.array({ onlyFirstError: true });

    next(validationError);
  });

module.exports = validate;

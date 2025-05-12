const AppError = require('./base');
const BadRequestError = require('./badRequest');
const AuthenticationError = require('./authentication');
const AuthorizationError = require('./authorization');
const NotFoundError = require('./notFound');
const DatabaseError = require('./database');

module.exports = {
  AppError,
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
};

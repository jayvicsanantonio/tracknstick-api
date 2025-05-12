require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./src/utils/logger');
const habitRoutes = require('./src/api/habits.routes');
const errorHandler = require('./src/middlewares/errorHandler');
const { NotFoundError } = require('./src/utils/errors');

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV === 'development' &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 1000000,
  standardHeaders: true,
  legacyHeaders: false,
  message: `Too many requests from this IP, please try again after ${Math.round((process.env.RATE_LIMIT_WINDOW_MS || 900000) / 60000)} minutes`,
});
app.use('/api', limiter);

app.use('/api/v1/habits', habitRoutes);

app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

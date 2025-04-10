require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const habitRoutes = require('./src/api/habits.routes');
const errorHandler = require('./src/middlewares/errorHandler');
const { NotFoundError } = require('./src/utils/errors');

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: function (origin, callback) {
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

app.use('/api/v1/habits', habitRoutes);

app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

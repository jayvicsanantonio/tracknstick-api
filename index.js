require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const habitRoutes = require('./src/api/habits.routes'); // Import the habit router
const errorHandler = require('./src/middlewares/errorHandler'); // Import the centralized error handler
const { NotFoundError } = require('./src/utils/errors'); // Import NotFoundError for 404s

const app = express();
const port = process.env.PORT || 3000; // Provide a default port

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      // Allow requests from any localhost port
      if (
        process.env.NODE_ENV === 'development' &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      // Block other origins
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount the habit routes under /api/v1/habits
app.use('/api/v1/habits', habitRoutes);

// Centralized 404 handler (after all routes)
// Creates a NotFoundError and passes it to the main error handler
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handler - Must be the last middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

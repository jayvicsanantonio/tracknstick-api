require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const habitRoutes = require('./src/api/habits.routes'); // Import the new router

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
app.use((req, res, next) => {
  res.status(404).json({ error: 'API Endpoint Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

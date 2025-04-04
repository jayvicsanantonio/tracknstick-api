require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const authenticate = require('./middlewares/authenticate');
const app = express();
const port = process.env.PORT;

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

app.get('/habits', authenticate, (req, res) => {
  const userId = req.userId;
  const date = req.query.date;
  const timeZone = req.query.timeZone;

  if (!date) {
    return res
      .status(400)
      .json({ error: 'Date parameter is required' });
  }

  const utcDate = new Date(date);

  if (Number.isNaN(utcDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  if (!timeZone) {
    return res
      .status(400)
      .json({ error: 'TimeZone parameter is required' });
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid timeZone format' });
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  });
  const day = formatter.format(utcDate);

  const selectStmt = db.prepare(
    `SELECT * FROM habits WHERE user_id = ? AND (',' || frequency || ',') LIKE '%,' || ? || ',%'`
  );

  selectStmt.all(userId, day, (err, habitRows) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: 'Failed to retrieve habits' });
    }

    const ids = habitRows.map((habitRow) => habitRow.id);
    const availableIdsPlaceholder = ids.map(() => '?').join(',');

    const localeDate = new Date(
      utcDate.toLocaleString('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    );

    const localeStart = new Date(
      localeDate.getFullYear(),
      localeDate.getMonth(),
      localeDate.getDate(),
      0,
      0,
      0,
      0
    );
    const localeEnd = new Date(
      localeDate.getFullYear(),
      localeDate.getMonth(),
      localeDate.getDate(),
      23,
      59,
      59,
      999
    );
    const selectTrackersStmt = db.prepare(
      `SELECT * FROM trackers WHERE habit_id in (${availableIdsPlaceholder}) AND user_id = ? AND (timestamp BETWEEN ? AND ?)`
    );

    selectTrackersStmt.all(
      ...ids,
      userId,
      localeStart.toISOString(),
      localeEnd.toISOString(),
      (err, trackerRows) => {
        if (err) {
          console.error(
            'Error selecting for existing trackers:',
            err
          );
          return res
            .status(500)
            .json({ error: 'Failed to check existing trackers' });
        }

        const habitIds = trackerRows.map(
          (trackRow) => trackRow.habit_id
        );

        const habits = habitRows.map((habitRow) => {
          const habit = {
            id: habitRow.id,
            name: habitRow.name,
            icon: habitRow.icon,
            frequency: habitRow.frequency.split(','),
            completed: habitIds.includes(habitRow.id),
            stats: {
              totalCompletions: habitRow.total_completions,
              streak: 0,
              lastCompleted: null,
            },
          };

          return habit;
        });

        res.json(habits);
      }
    );

    selectTrackersStmt.finalize();
  });
  selectStmt.finalize();
});

app.post('/habits', authenticate, (req, res) => {
  const { name, icon, frequency } = req.body;

  if (!name || !icon || !frequency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO habits (user_id, name, icon, frequency, streak, total_completions, last_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const userId = req.userId;

  insertStmt.run(
    userId,
    name,
    icon,
    frequency.join(','),
    0,
    0,
    null,
    function (err) {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: 'Failed to create habit' });
      }
      res.status(201).json({
        message: 'Habit created successfully',
        habitId: this.lastID, // Send the ID of the created habit
      });
    }
  );
  insertStmt.finalize();
});

app.put('/habits/:habitId', authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const { name, icon, frequency } = req.body;
  const userId = req.userId;

  if (!name || !icon || !frequency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const checkHabitStmt = db.prepare(
    `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`
  );

  checkHabitStmt.get(habitId, userId, (err, row) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: 'Failed to update habit' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    let updateQuery = 'UPDATE habits SET ';
    const updateParams = [];

    if (name) {
      updateQuery += 'name = ?, ';
      updateParams.push(name);
    }

    if (icon) {
      updateQuery += 'icon = ?, ';
      updateParams.push(icon);
    }

    if (frequency) {
      updateQuery += 'frequency = ?, ';
      updateParams.push(frequency.join(','));
    }

    updateQuery = updateQuery.slice(0, -2);
    updateQuery += ' WHERE id = ?';
    updateParams.push(habitId);

    const updateStmt = db.prepare(updateQuery);

    updateStmt.run(updateParams, function (err) {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: 'Failed to update habit' });
      }

      res.status(200).json({ message: 'Habit updated successfully' });
    });
    updateStmt.finalize();
  });
  checkHabitStmt.finalize();
});

app.delete('/habits/:habitId', authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const userId = req.userId;

  const checkHabitStmt = db.prepare(
    `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`
  );

  checkHabitStmt.get(habitId, userId, (err, row) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: 'Failed to delete habit' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const deleteTrackerStmt = db.prepare(
      `DELETE FROM trackers WHERE habit_id = ?`
    );

    deleteTrackerStmt.run(habitId, function (err) {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: 'Failed to delete related trackers' });
      }

      const deleteHabitStmt = db.prepare(
        `DELETE FROM habits WHERE id = ?`
      );

      deleteHabitStmt.run(habitId, function (err) {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: 'Failed to delete habit' });
        }

        res
          .status(200)
          .json({ message: 'Habit deleted successfully' });
      });

      deleteHabitStmt.finalize();
    });

    deleteTrackerStmt.finalize();
  });

  checkHabitStmt.finalize();
});

app.get('/habits/:habitId/trackers', authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const userId = req.userId;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  if (
    (startDate && Number.isNaN(new Date(startDate).getTime())) ||
    (endDate && Number.isNaN(new Date(endDate).getTime()))
  ) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const checkHabitStmt = db.prepare(
    `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`
  );

  checkHabitStmt.get(habitId, userId, (error, row) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to check habit' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    let selectQuery =
      'SELECT * FROM trackers WHERE habit_id = ? AND user_id = ?';
    const queryParams = [habitId, userId];

    if (startDate && endDate) {
      selectQuery +=
        ' AND DATE(timestamp) BETWEEN DATE(?) AND DATE(?)';
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      selectQuery += ' AND DATE(timestamp) >= DATE(?)';
      queryParams.push(startDate);
    } else if (endDate) {
      selectQuery += ' AND DATE(timestamp) <= DATE(?)';
      queryParams.push(endDate);
    }

    const selectStmt = db.prepare(selectQuery);

    selectStmt.all(queryParams, (err, rows) => {
      if (err) {
        console.error('Error fetching trackers:', err);
        return res
          .status(500)
          .json({ error: 'Failed to fetch trackers' });
      }

      res.json(rows);
    });
    selectStmt.finalize();
  });

  checkHabitStmt.finalize();
});

app.post('/habits/:habitId/trackers', authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const { timestamp, timeZone, notes } = req.body;
  const userId = req.userId;

  if (!timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const utcDate = new Date(timestamp);

  if (Number.isNaN(utcDate.getTime())) {
    return res
      .status(400)
      .json({ error: 'Invalid timestamp format' });
  }

  const localeDate = new Date(
    utcDate.toLocaleString('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  );

  const localeStart = new Date(
    localeDate.getFullYear(),
    localeDate.getMonth(),
    localeDate.getDate(),
    0,
    0,
    0,
    0
  );
  const localeEnd = new Date(
    localeDate.getFullYear(),
    localeDate.getMonth(),
    localeDate.getDate(),
    23,
    59,
    59,
    999
  );

  const checkStmt = db.prepare(
    `SELECT * FROM trackers WHERE habit_id = ? AND user_id = ? AND (timestamp BETWEEN ? AND ?)`
  );

  checkStmt.all(
    [
      habitId,
      userId,
      localeStart.toISOString(),
      localeEnd.toISOString(),
    ],
    (err, rows) => {
      if (err) {
        console.error('Error checking for existing tracker:', err);
        return res
          .status(500)
          .json({ error: 'Failed to check existing tracker' });
      }

      if (rows.length > 0) {
        const deleteStmt = db.prepare(
          'DELETE FROM trackers WHERE habit_id = ? AND user_id = ? AND (timestamp BETWEEN ? AND ?)'
        );
        deleteStmt.run(
          [
            habitId,
            userId,
            localeStart.toISOString(),
            localeEnd.toISOString(),
          ],
          function (err) {
            if (err) {
              console.error('Error deleting tracker:', err);
              return res
                .status(500)
                .json({ error: 'Failed to delete tracker' });
            }

            res.status(201).json({
              message: 'Tracker removed successfully',
            });
          }
        );
        deleteStmt.finalize();
      } else {
        const insertStmt = db.prepare(
          'INSERT INTO trackers (habit_id, user_id, timestamp, notes) VALUES (?, ?, ?, ?)'
        );
        insertStmt.run(
          [habitId, userId, timestamp, notes],
          function (err) {
            if (err) {
              console.error('Error inserting tracker:', err);
              return res
                .status(500)
                .json({ error: 'Failed to insert tracker' });
            }

            res.status(201).json({
              message: 'Tracker added successfully',
              trackerId: this.lastID,
            });
          }
        );
        insertStmt.finalize();
      }
    }
  );

  checkStmt.finalize();
});

app.get('/habits/:habitId/stats', authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const userId = req.userId;
  const timeZone = req.query.timeZone;

  if (!timeZone) {
    return res
      .status(400)
      .json({ error: 'TimeZone parameter is required' });
  }

  try {
    // Validate timezone
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid timeZone format' });
  }

  // 1. Get Habit Frequency
  const getHabitStmt = db.prepare(
    `SELECT frequency FROM habits WHERE id = ? AND user_id = ?`
  );

  getHabitStmt.get(habitId, userId, (err, habitRow) => {
    if (err) {
      console.error('Error fetching habit:', err);
      return res
        .status(500)
        .json({ error: 'Failed to retrieve habit data' });
    }
    if (!habitRow) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const frequency = habitRow.frequency.split(','); // e.g., ['Mon', 'Wed', 'Fri']

    // 2. Get All Tracker Timestamps (ordered)
    const getTrackersStmt = db.prepare(
      `SELECT timestamp FROM trackers WHERE habit_id = ? AND user_id = ? ORDER BY timestamp DESC`
    );

    getTrackersStmt.all(habitId, userId, (err, trackerRows) => {
      if (err) {
        console.error('Error fetching trackers:', err);
        return res
          .status(500)
          .json({ error: 'Failed to retrieve tracker data' });
      }

      // 3. Calculate Stats
      const totalCompletions = trackerRows.length;
      const lastCompleted =
        trackerRows.length > 0 ? trackerRows[0].timestamp : null;

      // --- Streak Calculation ---
      let currentStreak = 0;
      if (trackerRows.length > 0) {
        const uniqueCompletionDates = [
          ...new Set(
            trackerRows.map((row) => {
              // Convert UTC timestamp to locale date string (YYYY-MM-DD)
              const utcDate = new Date(row.timestamp);
              const localeDateStr = utcDate.toLocaleDateString(
                'en-CA',
                { timeZone }
              ); // 'en-CA' gives YYYY-MM-DD
              return localeDateStr;
            })
          ),
        ].sort((a, b) => b.localeCompare(a)); // Sort dates descending (most recent first)

        const today = new Date();
        let currentDate = new Date(
          today.toLocaleDateString('en-CA', { timeZone })
        ); // Start checking from today in user's timezone

        for (let i = 0; i < uniqueCompletionDates.length; i++) {
          const completionDate = new Date(uniqueCompletionDates[i]);

          // Check if the completion date matches the date we are currently checking
          if (completionDate.getTime() !== currentDate.getTime()) {
            // If the most recent completion wasn't today, maybe it was yesterday?
            if (i === 0) {
              const yesterday = new Date(currentDate);
              yesterday.setDate(currentDate.getDate() - 1);
              if (completionDate.getTime() === yesterday.getTime()) {
                // Most recent completion was yesterday, start checking streak from yesterday
                currentDate = yesterday;
              } else {
                // Most recent completion was neither today nor yesterday, streak is 0
                break;
              }
            } else {
              // Gap detected, streak broken
              break;
            }
          }

          // Check if the habit was scheduled for this day
          const dayFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            weekday: 'short',
          });
          const dayOfWeek = dayFormatter.format(currentDate); // Get day like 'Mon'

          if (frequency.includes(dayOfWeek)) {
            // Habit was scheduled and completed on this day
            currentStreak++;
          } else {
            // Habit was completed but *not* scheduled for this day.
            // This shouldn't break the streak according to typical habit tracker logic.
            // We just need to check the *previous* day now.
          }

          // Move to the previous day for the next iteration
          currentDate.setDate(currentDate.getDate() - 1);
        }
      }
      // --- End Streak Calculation ---

      res.json({
        habit_id: habitId,
        user_id: userId,
        streak: currentStreak,
        total_completions: totalCompletions,
        last_completed: lastCompleted,
      });
    });
    getTrackersStmt.finalize();
  });
  getHabitStmt.finalize();
});

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

function calculateStreak() {
  // TODO: Implement the streak calculation logic
}

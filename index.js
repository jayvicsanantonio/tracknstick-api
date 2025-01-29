require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const db = require("./db");
const authenticate = require("./middlewares/authenticate");
const app = express();
const port = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/habits", authenticate, (req, res) => {
  const userId = req.userId;
  const date = req.query.date;
  const timeZone = req.query.timeZone;

  if (!date) {
    return res.status(400).json({ error: "Date parameter is required" });
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  const localeDate = parsedDate.toLocaleString("en-US", { timeZone });
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = daysOfWeek[new Date(localeDate).getDay()];
  const selectStmt = db.prepare(
    `SELECT * FROM habits WHERE user_id = ? AND (',' || frequency || ',') LIKE '%,' || ? || ',%'`
  );

  selectStmt.all(userId, day, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to retrieve habits" });
    }

    const habits = rows.map((row) => {
      const habit = {
        id: row.id,
        name: row.name,
        icon: row.icon,
        frequency: row.frequency.split(","),
        completed: false,
        stats: {
          totalCompletions: row.total_completions,
          streak: 0,
          lastCompleted: null,
        },
      };

      return habit;
    });

    res.json(habits);
  });
  selectStmt.finalize();
});

app.post("/habits", authenticate, (req, res) => {
  const { name, icon, frequency } = req.body;

  if (!name || !icon || !frequency) {
    return res.status(400).json({ error: "Missing required fields" });
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
    frequency.join(","),
    0,
    0,
    null,
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create habit" });
      }
      res.status(201).json({
        message: "Habit created successfully",
        habitId: this.lastID, // Send the ID of the created habit
      });
    }
  );
  insertStmt.finalize();
});

app.put("/habits/:habitId", authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const { name, icon, frequency } = req.body;
  const userId = req.userId;

  if (!name || !icon || !frequency) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const checkHabitStmt = db.prepare(
    `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`
  );

  checkHabitStmt.get(habitId, userId, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to update habit" });
    }

    if (!row) {
      return res.status(404).json({ error: "Habit not found" });
    }

    let updateQuery = "UPDATE habits SET ";
    const updateParams = [];

    if (name) {
      updateQuery += "name = ?, ";
      updateParams.push(name);
    }

    if (icon) {
      updateQuery += "icon = ?, ";
      updateParams.push(icon);
    }

    if (frequency) {
      updateQuery += "frequency = ?, ";
      updateParams.push(frequency.join(","));
    }

    updateQuery = updateQuery.slice(0, -2);
    updateQuery += " WHERE id = ?";
    updateParams.push(habitId);

    const updateStmt = db.prepare(updateQuery);

    updateStmt.run(updateParams, function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update habit" });
      }

      res.status(200).json({ message: "Habit updated successfully" });
    });
    updateStmt.finalize();
  });
  checkHabitStmt.finalize();
});

app.delete("/habits/:habitId", authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const userId = req.userId;

  const checkHabitStmt = db.prepare(
    `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`
  );

  checkHabitStmt.get(habitId, userId, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete habit" });
    }

    if (!row) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const deleteTrackerStmt = db.prepare(
      `DELETE FROM trackers WHERE habit_id = ?`
    );

    deleteTrackerStmt.run(habitId, function (err) {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Failed to delete related trackers" });
      }

      const deleteHabitStmt = db.prepare(`DELETE FROM habits WHERE id = ?`);

      deleteHabitStmt.run(habitId, function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to delete habit" });
        }

        res.status(200).json({ message: "Habit deleted successfully" });
      });

      deleteHabitStmt.finalize();
    });

    deleteTrackerStmt.finalize();
  });

  checkHabitStmt.finalize();
});

app.get("/habits/:habitId/trackers", authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const userId = req.userId;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  if (
    (startDate && Number.isNaN(new Date(startDate).getTime())) ||
    (endDate && Number.isNaN(new Date(endDate).getTime()))
  ) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  const checkHabitStmt = db.prepare(
    `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`
  );

  checkHabitStmt.get(habitId, userId, (error, row) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to check habit" });
    }

    if (!row) {
      return res.status(404).json({ error: "Habit not found" });
    }

    let selectQuery =
      "SELECT * FROM trackers WHERE habit_id = ? AND user_id = ?";
    const queryParams = [habitId, userId];

    if (startDate && endDate) {
      selectQuery += " AND DATE(timestamp) BETWEEN DATE(?) AND DATE(?)";
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      selectQuery += " AND DATE(timestamp) >= DATE(?)";
      queryParams.push(startDate);
    } else if (endDate) {
      selectQuery += " AND DATE(timestamp) <= DATE(?)";
      queryParams.push(endDate);
    }

    const selectStmt = db.prepare(selectQuery);

    selectStmt.all(queryParams, (err, rows) => {
      if (err) {
        console.error("Error fetching trackers:", err);
        return res.status(500).json({ error: "Failed to fetch trackers" });
      }

      res.json(rows);
    });
    selectStmt.finalize();
  });

  checkHabitStmt.finalize();
});

app.post("/habits/:habitId/trackers", authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const { timestamp, timeZone, notes } = req.body;
  const userId = req.userId;

  if (!timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const utcDate = new Date(timestamp);
  const localeDate = new Date(
    utcDate.toLocaleString("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
  );

  const lacaleStart = new Date(
    localeDate.getFullYear(),
    localeDate.getMonth(),
    localeDate.getDate(),
    0,
    0,
    0,
    0
  );
  const lacaleEnd = new Date(
    localeDate.getFullYear(),
    localeDate.getMonth(),
    localeDate.getDate(),
    23,
    59,
    59,
    999
  );

  const utcStart = new Date(
    lacaleStart.toLocaleString("en-US", { timeZone: "UTC" })
  );
  const utcEnd = new Date(
    lacaleEnd.toLocaleString("en-US", { timeZone: "UTC" })
  );

  const checkStmt = db.prepare(
    `SELECT * FROM trackers WHERE habit_id = ? AND user_id = ? AND (timestamp BETWEEN ? AND ?)`
  );

  checkStmt.all(
    [habitId, userId, utcStart.toISOString(), utcEnd.toISOString()],
    (err, rows) => {
      if (err) {
        console.error("Error checking for existing tracker:", err);
        return;
      }

      if (rows.length > 0) {
        const deleteStmt = db.prepare(
          "DELETE FROM trackers WHERE habit_id = ? AND user_id = ? AND timestamp = ?"
        );
        deleteStmt.run([habitId, userId, timestamp], function (err) {
          if (err) {
            console.error("Error deleting tracker:", err);
            return;
          }

          res.status(201).json({
            message: "Tracker removed successfully",
          });
        });
        deleteStmt.finalize();
      } else {
        const insertStmt = db.prepare(
          "INSERT INTO trackers (habit_id, user_id, timestamp, notes) VALUES (?, ?, ?, ?)"
        );
        insertStmt.run([habitId, userId, timestamp, notes], function (err) {
          if (err) {
            console.error("Error inserting tracker:", err);
            return;
          }

          res.status(201).json({
            message: "Tracker added successfully",
            trackerId: this.lastID,
          });
        });
        insertStmt.finalize();
      }
    }
  );

  checkStmt.finalize();
});

app.use((req, res, next) => {
  res.status(404).json({ error: "API Endpoint Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

function calculateStreak() {
  // TODO: Implement the streak calculation logic
}

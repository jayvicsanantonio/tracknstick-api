require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const db = require("./db");
const authenticate = require("./middlewares/authenticate");
const app = express();
const port = process.env.PORT;

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/habits", authenticate, (req, res) => {
  const userId = req.userId;

  const selectStmt = db.prepare("SELECT * FROM habits WHERE user_id = ?");

  selectStmt.all(userId, (err, rows) => {
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
        totalCompletions: row.total_completions,
        streak: 0,
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

app.post("/habits/:habitId/trackers", authenticate, (req, res) => {
  const habitId = req.params.habitId;
  const { timestamp, notes } = req.body;
  const userId = req.userId;

  if (!timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
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

    const insertTrackerStmt = db.prepare(`
      INSERT INTO trackers (habit_id, timestamp, notes)
      VALUES (?, ?, ?)
    `);

    insertTrackerStmt.run(habitId, timestamp, notes, function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to check habit" });
      }

      res.status(201).json({
        message: "Tracker added successfully",
        trackerId: this.lastID,
      });
    });
    insertTrackerStmt.finalize();
  });

  checkHabitStmt.finalize();
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

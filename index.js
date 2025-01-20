require("dotenv").config();

const express = require("express");
const authenticate = require("./middlewares/authenticate");
const app = express();
const port = 3000;

app.get("/", authenticate, (req, res) => {
  res.send("Welcome to the Habit Tracker API!");
});

app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

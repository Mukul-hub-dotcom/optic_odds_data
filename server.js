const db = require("./db");
const express = require("express");
const app = express();
const sportsRouter = require("./routes/sports");
const leagueMasterRouter = require("./routes/leagueMaster");
const leagueRouter = require("./routes/leagues");
const sportsEventRouter = require("./routes/vi_lsports_events");

app.use("/sports-name", sportsRouter);
app.use("/master-league", leagueMasterRouter);
app.use("/vi-league", leagueRouter);
app.use("/vi-lsports-events", sportsEventRouter);

const server = app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

const shutdown = () => {
  server.close(() => {
    console.log("Server closed");
    db.pool.end(() => {
      console.log("Database pool closed");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

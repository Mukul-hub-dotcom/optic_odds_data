const express = require("express");
const db = require("../db");
const axios = require("axios");
const router = express.Router();

router.post("/", async (req, res) => {
  const url =
    "https://api.opticodds.com/api/v3/leagues?key=2f5a62c8-3bad-4c04-8ffa-78e786909f9a";

  try {
    const response = await axios.get(url);
    const leagueData = response.data.data;

    const insertQuery = `
      INSERT INTO master_league (league_id, name, sport, region, region_code)
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (const league of leagueData) {
      await db.query(insertQuery, [
        league.id,
        league.name,
        league.sport,
        league.region,
        league.region_code,
      ]);
    }

    res.status(200).send("Data successfully inserted into master_league table");
  } catch (error) {
    console.error("Error inserting data into master_league table:", error);
    res
      .status(500)
      .send("An error occurred while inserting data into the table");
  }
});

module.exports = router;

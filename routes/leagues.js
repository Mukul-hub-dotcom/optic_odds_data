const express = require("express");
const db = require("../db");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const response = await db.query("SELECT * FROM master_league");
    const leagueData = response.rows;

    const sportResponse = await db.query(
      "SELECT sports_id, sports_name FROM vi_ex_master_sports"
    );
    const sportMappings = sportResponse.rows.reduce((map, row) => {
      map[row.sports_name] = row.sports_id;
      return map;
    }, {});

    const insertQuery = `
      INSERT INTO vi_ls_leagues (
        league_uid, location_id, sport_guid, league_abbr, league_name, region, 
        active, agent_active, updated_date, is_deleted, is_agent_deleted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    for (const league of leagueData) {
      const league_abbr = league.league_id.split("_")[0];

      const sport_guid = sportMappings[league.sport.name] || null;

      await db.query(insertQuery, [
        league.id,
        0001,
        sport_guid,
        league_abbr,
        league.name,
        league.region,
        false,
        true,
        new Date(),
        false,
        false,
      ]);
    }

    res.status(200).send("Data successfully inserted into vi_ls_leagues table");
  } catch (error) {
    console.error("Error inserting data into vi_ls_leagues table:", error);
    res
      .status(500)
      .send("An error occurred while inserting data into the table");
  }
});

module.exports = router;

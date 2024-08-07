const express = require("express");
const db = require("../db");
const axios = require("axios");
const router = express.Router();
require("dotenv").config();

const key = process.env.OPTIC_ODDS_KEY;

router.post("/", async (req, res) => {
  const url = `https://api.opticodds.com/api/v3/leagues?key=${key}`;

  try {
    const response = await axios.get(url);
    const leagueData = response.data.data;

    const insertQuery = `
      INSERT INTO master_league (league_id, name, sport, region, region_code)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (league_id) 
      DO UPDATE SET name = EXCLUDED.name, sport = EXCLUDED.sport, region = EXCLUDED.region, region_code = EXCLUDED.region_code,updated_at = NOW()
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
    await generateLeague();
    res.status(200).send("Data successfully inserted into master_league table");
  } catch (error) {
    console.error("Error inserting data into master_league table:", error);
    res
      .status(500)
      .send("An error occurred while inserting data into the table");
  }
});

async function generateLeague() {
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
      ON CONFLICT (league_uid)
      DO UPDATE SET location_id = EXCLUDED.location_id, sport_guid = EXCLUDED.sport_guid, league_abbr = EXCLUDED.league_abbr, league_name = EXCLUDED.league_name, region = EXCLUDED.region, 
                    active = EXCLUDED.active, agent_active = EXCLUDED.agent_active, updated_date = EXCLUDED.updated_date, is_deleted = EXCLUDED.is_deleted, is_agent_deleted = EXCLUDED.is_agent_deleted
    `;

    for (const league of leagueData) {
      const league_abbr = league.league_id.split("_")[0];

      const sport_guid = sportMappings[league.sport.name] || null;

      await db.query(insertQuery, [
        league.league_id,
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
    console.log("Data successfully inserted into vi_ls_leagues table");
  } catch (error) {
    console.error("Error inserting data into vi_ls_leagues table:", error);
  }
}

module.exports = router;

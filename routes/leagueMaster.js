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
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      name = VALUES(name), sport = VALUES(sport), region = VALUES(region), region_code = VALUES(region_code), updated_at = CURRENT_TIMESTAMP
    `;

    for (const league of leagueData) {
      await db.query(insertQuery, [
        league.id,
        league.name,
        JSON.stringify(league.sport), 
        league.region,
        league.region_code,
      ]);
    }
    await generateLeague();
    res.status(200).send("Data successfully inserted into master_league table");
  } catch (error) {
    console.error("Error inserting data into master_league table:", error);
    res.status(500).send("An error occurred while inserting data into the table");
  }
});

async function generateLeague() {
  try {
    const [leagueResponse] = await db.query("SELECT * FROM master_league");
    const leagueData = leagueResponse;


    const insertQuery = `
      INSERT INTO vi_ls_leagues (
        league_uid, location_id, sport_guid, league_abbr, league_name, region, 
        active, agent_active, updated_date, is_deleted, is_agent_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      location_id = VALUES(location_id), sport_guid = VALUES(sport_guid), league_abbr = VALUES(league_abbr), league_name = VALUES(league_name), region = VALUES(region), 
      active = VALUES(active), agent_active = VALUES(agent_active), updated_date = VALUES(updated_date), is_deleted = VALUES(is_deleted), is_agent_deleted = VALUES(is_agent_deleted)
    `;

    for (const league of leagueData) {
      const league_abbr = league.league_id.split("_")[0];
       const sportName = JSON.parse(league.sport).name
       const query = 'SELECT sports_id FROM vi_ex_master_sports WHERE sports_name = ?';
       const [rows] = await db.query(query, [sportName]);
       
      const sport_guid = rows[0].sports_id;

      await db.query(insertQuery, [
        league.league_id,
        1, 
        sport_guid,
        league_abbr,
        league.name,
        league.region,
        0, 
        1, 
        new Date(),
        0, 
        0, 
      ]);
    }
    console.log("Data successfully inserted into vi_ls_leagues table");
  } catch (error) {
    console.error("Error inserting data into vi_ls_leagues table:", error);
  }
}

module.exports = router;

const express = require("express");
const db = require("../db");
const axios = require("axios");
const router = express.Router();
require('dotenv').config();

const key = process.env.OPTIC_ODDS_KEY;

router.post("/", async (req, res) => {
  const url = `https://api.opticodds.com/api/v3/sports?key=${key}`;

  try {
    const response = await axios.get(url);
    const sportsData = response.data.data;

    for (const sport of sportsData) {
      const { id: sport_guid, name: sports_name } = sport;

      const [existingSport] = await db.query(
        "SELECT * FROM vi_ex_master_sports WHERE sports_name = ?",
        [sports_name]
      );

      if (existingSport.length === 0) {
        const query = `
          INSERT INTO vi_ex_master_sports (
            lsport_guid, sports_name, updated_date, 
            provider_name 
          ) VALUES (?, ?, CURRENT_TIMESTAMP, ?)
        `;

        const values = [56789, sports_name, "optic_odds"];

        await db.query(query, values);
      }
    }

    res.status(200).send("Data inserted successfully");
  } catch (err) {
    console.error("Error fetching or inserting data:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

const express = require("express");
const db = require("../db");
const axios = require("axios");
const router = express.Router();

router.post("/", async (req, res) => {
  const url =
    "https://api.opticodds.com/api/v3/sports?key=2f5a62c8-3bad-4c04-8ffa-78e786909f9a";

  try {
    const response = await axios.get(url);
    const sportsData = response.data.data;

    for (const sport of sportsData) {
      const { id: sport_guid, name: sports_name } = sport;

      const existingSport = await db.query(
        "SELECT * FROM vi_ex_master_sports WHERE sports_name = $1",
        [sports_name]
      );

      if (existingSport.rows.length === 0) {
        const query = `
        INSERT INTO vi_ex_master_sports (
           lsport_guid, sports_name, updated_date, 
          provider_name 
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
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

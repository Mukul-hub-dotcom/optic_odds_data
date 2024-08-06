const express = require("express");
const axios = require("axios");
const db = require("../db");
const router = express.Router();
const jsonData = require("../oddData.json");

console.log(jsonData.data[0].odds);
router.post("/", async (req, res) => {
  // const url =
  // "https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=1XBet&key=2f5a62c8-3bad-4c04-8ffa-78e786909f9a&fixture_id=CC511CE89DE5";

  try {
    // const response = await axios.get(url);
    // const market_odds = response.data.data;

    const event_id = jsonData.data[0].id;
    const oddData = jsonData.data[0].odds;

    const insertQuery = `
    INSERT INTO vi_lsport_market_odds (
      event_id,
      market_id,
      market_name,
      market_key,
      id,
      name
  ) VALUES ($1, $2, $3, $4, $5, $6);
    `;

    for (const odd of oddData) {
      await db.query(insertQuery, [
        event_id,
        odd.market_id,
        odd.market,
        odd.market,
        odd.id,
        odd.name,
      ]);
    }

    res
      .status(200)
      .send("Data successfully inserted into vi_lsport_market_odds table");
  } catch (error) {
    console.error(
      "Error inserting data into vi_lsport_market_odds table:",
      error
    );
    res
      .status(500)
      .send("An error occurred while inserting data into the table");
  }
});

module.exports = router;

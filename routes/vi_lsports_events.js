const express = require("express");
const axios = require("axios");
const db = require("../db");
const router = express.Router();
require("dotenv").config();

const key = process.env.OPTIC_ODDS_KEY;

router.post("/", async (req, res) => {
  const sportData = await db.query(
    "SELECT sports_name FROM vi_ex_master_sports WHERE active=true"
  );
  const sports = sportData.rows;
  try {
    let fixtureLoop = [];
    let fixtureTotalPage = [];

    for (const sport of sports) {
      const url = `https://api.opticodds.com/api/v3/fixtures?sport=${sport.sports_name.toLowerCase()}&key=${key}`;
      const response = await axios.get(url);
      const fixturesPages = response.data.total_pages;
      fixtureTotalPage.push(fixturesPages);
    }
    console.log(fixtureTotalPage);

    for (let i = 0; i < fixtureTotalPage.length; i++) {
      let pages = fixtureTotalPage[i];
      for (let j = 1; j <= pages; j++) {
        const url = `https://api.opticodds.com/api/v3/fixtures?sport=${sports[
          i
        ].sports_name.toLowerCase()}&key=${key}&page=${j}`;
        const response = await axios.get(url);
        const fixturesData = response.data.data;
        fixtureLoop.push(...fixturesData);
      }
    }

    for (const fixture of fixtureLoop) {
      const {
        id: event_id,
        start_date,
        home_team_display,
        away_team_display,
        league: { id, name: league_name },
        sport: { name: sport_name },
        status,
        is_live,
      } = fixture;

      try {
        const leagueQuery = "SELECT id FROM master_league WHERE name = $1";
        const leagueResult = await db.query(leagueQuery, [league_name]);
        const league_uid = leagueResult.rows[0]?.id;

        const sportQuery =
          "SELECT sports_id FROM vi_ex_master_sports WHERE sports_name = $1";
        const sportResult = await db.query(sportQuery, [sport_name]);
        const sport_guid = sportResult.rows[0]?.sports_id;

        const currentDate = new Date();
        const fixtureDate = new Date(start_date);
        let time_status;

        if (is_live) {
          time_status = 1;
        } else if (fixtureDate > currentDate) {
          time_status = 0;
        } else {
          time_status = 3;
        }

        const insertQuery = `
          INSERT INTO vi_lsport_events (
            event_id, sport_guid, unique_id, time_status, r_id, league_uid, open_date, updated_at, ss,
            team_1, team_2, league_json, participants, participant_name, admin_status, agent_status,
            is_live, total_cap, agent_total_cap, is_auto_settle, chanel_id, cta_background_color,
            cta_font_color, background_image, "order", is_notify, rz_match_id, is_widget
          ) VALUES (
            $1, $2, DEFAULT, $3, DEFAULT, $4, $5, CURRENT_TIMESTAMP, DEFAULT,
            $6, $7, $8::jsonb, $9::jsonb, $10, TRUE, TRUE, $11, DEFAULT, DEFAULT, TRUE,
            DEFAULT, DEFAULT, DEFAULT, DEFAULT, DEFAULT, DEFAULT, DEFAULT, DEFAULT
          ) ON CONFLICT (event_id) DO UPDATE SET
            sport_guid = EXCLUDED.sport_guid,
            time_status = EXCLUDED.time_status,
            league_uid = EXCLUDED.league_uid,
            open_date = EXCLUDED.open_date,
            updated_at = CURRENT_TIMESTAMP,
            team_1 = EXCLUDED.team_1,
            team_2 = EXCLUDED.team_2,
            league_json = EXCLUDED.league_json,
            participants = EXCLUDED.participants,
            participant_name = EXCLUDED.participant_name,
            is_live = EXCLUDED.is_live
        `;

        const values = [
          event_id,
          sport_guid,
          time_status,
          league_uid,
          start_date,
          fixture.home_competitors[0].id,
          fixture.away_competitors[0].id,
          JSON.stringify({
            id: id,
            name: league_name,
          }),
          JSON.stringify({
            home: fixture.home_competitors,
            away: fixture.away_competitors,
          }),
          `${home_team_display} Vs ${away_team_display}`,
          is_live,
        ];

        await db.query(insertQuery, values);
        await fetchAndInsertOdds(fixture.id);
      } catch (err) {
        console.error(`Error inserting fixture ${fixture.id}:`, err);
      }
    }

    res.status(200).send("Fixtures data inserted/updated successfully");
  } catch (err) {
    console.error("Error fetching or processing data:", err);
    res.status(500).send("Server Error");
  }
});

async function fetchAndInsertOdds(fixtureId) {
  const url = `https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=1XBet&key=${key}&fixture_id=${fixtureId}`;

  try {
    const response = await axios.get(url);
    if (response.data.data.length == 0) {
      console.log("No odds data for fixture", fixtureId);
      return;
    }
    const event_id = response.data.data[0].id;
    const oddData = response.data.data[0].odds;
    if (oddData.length == 0) {
      console.log("No odds available for event", event_id);
      return;
    }

    const insertQuery = `
      INSERT INTO vi_lsport_market_odds (
        event_id, market_id, market_name, market_key, id, name
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        market_name = EXCLUDED.market_name,
        market_key = EXCLUDED.market_key,
        name = EXCLUDED.name
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

    console.log(
      "Data successfully inserted/updated into vi_lsport_market_odds table"
    );
  } catch (error) {
    console.error(
      "Error inserting/updating data into vi_lsport_market_odds table:",
      error
    );
  }
}

module.exports = router;

const express = require("express");
const axios = require("axios");
const db = require("../db");
const router = express.Router();

router.post("/", async (req, res) => {
  const apiKey = "2f5a62c8-3bad-4c04-8ffa-78e786909f9a";
  const sportData = await db.query(
    "SELECT sports_name FROM vi_ex_master_sports WHERE active=true"
  );
  const sports = sportData.rows;
  try {
    let fixtureLoop = [];
    let fixtureTotalPage = [];

    for (const sport of sports) {
      const url = `https://api.opticodds.com/api/v3/fixtures?sport=${sport.sports_name.toLowerCase()}&key=${apiKey}`;
      const response = await axios.get(url);
      const fixturesPages = response.data.total_pages;
      fixtureTotalPage.push(fixturesPages);
    }
    console.log(fixtureTotalPage);

    for (let i = 0; i < fixtureTotalPage.length; i++) {
      let count = 0;
      let pages = fixtureTotalPage[i];
      for (let j = 1; j <= pages; j++) {
        const url = `https://api.opticodds.com/api/v3/fixtures?sport=${sports[
          i
        ].sports_name.toLowerCase()}&key=${apiKey}&page=${j}`;
        const response = await axios.get(url);
        const fixturesData = response.data.data;
        fixtureLoop.push(...fixturesData);
      }
    }
    console.log(fixtureLoop.length);

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
        // Fetch league_uid
        const leagueQuery = "SELECT id FROM master_league WHERE name = $1";
        const leagueResult = await db.query(leagueQuery, [league_name]);
        const league_uid = leagueResult.rows[0]?.id;

        // Fetch sport_guid
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
          time_status = 3; // Past
        }

        // Insert fixture into vi_lsport_events
        const insertQuery = `
          INSERT INTO vi_lsport_events (
            event_id, sport_guid, unique_id, time_status, r_id, league_uid, open_date, updated_at, ss,
            team_1, team_2, league_json, participants, participant_name, admin_status, agent_status,
            is_live, total_cap, agent_total_cap, is_auto_settle, chanel_id, cta_background_color,
            cta_font_color, background_image, "order", is_notify, rz_match_id, is_widget
          ) VALUES (
            $1, $2, DEFAULT,$3, DEFAULT, $4, $5, CURRENT_TIMESTAMP, DEFAULT,
            $6, $7, $8::jsonb, $9::jsonb, $10, TRUE, TRUE, $11, DEFAULT, DEFAULT, TRUE,
            DEFAULT, DEFAULT, DEFAULT, DEFAULT,DEFAULT, DEFAULT, DEFAULT,DEFAULT
          )
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
      } catch (err) {
        console.error(`Error inserting fixture ${fixture.id}:`, err);
        // Optionally handle specific fixture errors here
      }
    }

    res.status(200).send("Fixtures data inserted successfully");
  } catch (err) {
    console.error("Error fetching or processing data:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

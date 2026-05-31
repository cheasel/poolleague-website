// scripts/seed.ts
import { fileURLToPath } from "url";
import path from "path";
import * as dotenv from "dotenv";

// Load environment variables explicitly before importing the db client
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { db } from "../src/db";
import { divisions, teams, players, matches, matchGames, seasons, teamRegistrations, teamMemberships } from "../src/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function runSeed() {
    console.log("🚀 Starting database seeding sequence...");
  
    try {
      console.log("🧹 Purging old data tables...");
      await db.delete(matchGames);
      await db.delete(matches);
      await db.delete(teamMemberships);
      await db.delete(teamRegistrations);
      await db.delete(players);
      await db.delete(teams);
      await db.delete(divisions);
      await db.delete(seasons);
  
      console.log("📅 Seeding seasons...");
      const [season] = await db
        .insert(seasons)
        .values({
          name: "Inaugural Season",
          isActive: true,
          startDate: new Date("2026-05-01"),
        })
        .returning();

      console.log("🏆 Seeding league divisions...");
      const seededDivs = await db
        .insert(divisions)
        .values([
          { name: "Premier Division", tier: 1, seasonId: season.id },
          { name: "Championship Division", tier: 2, seasonId: season.id },
        ])
        .returning();
  
      const premDiv = seededDivs[0];
      const champDiv = seededDivs[1];
  
      console.log("🛡️ Seeding club squads...");
      const seededTeams = await db
        .insert(teams)
        .values([
          { name: "Crucible Club" },
          { name: "The Rack Pack" },
          { name: "Cue Masters" },
          { name: "Pocket Rocketeers" },
        ])
        .returning();
  
      const crucibleClub = seededTeams[0];
      const rackPack = seededTeams[1];
      const cueMasters = seededTeams[2];
      const pocketRocketeers = seededTeams[3];
  
      console.log("🔗 Registering teams to divisions...");
      await db.insert(teamRegistrations).values([
        { teamId: crucibleClub.id, divisionId: premDiv.id, seasonId: season.id },
        { teamId: rackPack.id, divisionId: premDiv.id, seasonId: season.id },
        { teamId: cueMasters.id, divisionId: champDiv.id, seasonId: season.id },
        { teamId: pocketRocketeers.id, divisionId: champDiv.id, seasonId: season.id },
      ]);

      console.log("👥 Seeding active roster players...");
      const seededPlayers = await db
        .insert(players)
        .values([
          { name: "Ronnie O'Sullivan" },
          { name: "Judd Trump" },
          { name: "John Higgins" },
          { name: "Mark Selby" },
          { name: "Neil Robertson" },
          { name: "Mark Williams" },
          { name: "Shaun Murphy" },
          { name: "Kyren Wilson" },
          { name: "Ding Junhui" },
          { name: "Luca Brecel" },
          { name: "Ali Carter" },
          { name: "Jack Lisowski" },
        ])
        .returning();
  
      const p = (name: string) => seededPlayers.find((pl) => pl.name === name)?.id || null;

      console.log("🔗 Assigning players to team rosters...");
      const getTeamId = (playerName: string) => {
        if (["Ronnie O'Sullivan", "Judd Trump", "John Higgins"].includes(playerName)) return crucibleClub.id;
        if (["Mark Selby", "Neil Robertson", "Mark Williams"].includes(playerName)) return rackPack.id;
        if (["Shaun Murphy", "Kyren Wilson", "Ding Junhui"].includes(playerName)) return cueMasters.id;
        return pocketRocketeers.id;
      };

      const getDivisionId = (playerName: string) => {
        if (["Ronnie O'Sullivan", "Judd Trump", "John Higgins", "Mark Selby", "Neil Robertson", "Mark Williams"].includes(playerName)) return premDiv.id;
        return champDiv.id;
      };

      await db.insert(teamMemberships).values(
        seededPlayers.map((pl) => ({
          playerId: pl.id,
          teamId: getTeamId(pl.name),
          seasonId: season.id,
          divisionId: getDivisionId(pl.name),
          isCaptain: false,
        }))
      );
  
      console.log("📅 Seeding completed match score sheets...");
      const seededMatches = await db
        .insert(matches)
        .values([
          {
            homeTeamId: crucibleClub.id,
            awayTeamId: rackPack.id,
            homeScore: 3,
            awayScore: 1,
            status: "completed",
            divisionId: premDiv.id,
            seasonId: season.id,
            date: new Date("2026-05-10"),
          },
        ])
        .returning();

      const match1 = seededMatches[0];
  
      console.log("🎱 Injecting frame results data matrix...");
      await db.insert(matchGames).values([
        {
          matchId: match1.id,
          gameOrder: 1,
          gameType: "single",
          player1Id: p("Ronnie O'Sullivan"),
          player2Id: p("Mark Selby"),
          player1Score: 1,
          player2Score: 0,
        },
        {
          matchId: match1.id,
          gameOrder: 2,
          gameType: "single",
          player1Id: p("Judd Trump"),
          player2Id: p("Neil Robertson"),
          player1Score: 1,
          player2Score: 0,
        },
        {
          matchId: match1.id,
          gameOrder: 3,
          gameType: "double",
          player1Id: p("Ronnie O'Sullivan"),
          player1PartnerId: p("John Higgins"),
          player2Id: p("Mark Selby"),
          player2PartnerId: p("Mark Williams"),
          player1Score: 0,
          player2Score: 1,
        },
        {
          matchId: match1.id,
          gameOrder: 4,
          gameType: "single",
          player1Id: p("Ronnie O'Sullivan"),
          player2Id: p("Mark Williams"),
          player1Score: 1,
          player2Score: 0,
        },
      ]);
  
      console.log("🎉 Seeding completed successfully! Clean database rows prepared.");
    } catch (error) {
      console.error("❌ Seeding transaction crash error:", error);
      process.exit(1);
    } finally {
      process.exit(0);
    }
  }
  
  runSeed();
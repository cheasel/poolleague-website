// scripts/seed.ts
import { fileURLToPath } from "url";
import path from "path";
import * as dotenv from "dotenv";

// Load environment variables explicitly before importing the db client
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { db } from "../src/db";
import { divisions, teams, players, matches, matchGames } from "../src/db/schema";
import { eq } from "drizzle-orm";

// scripts/seed.ts

// ... (keep your environment variable configuration at the top exactly the same)

async function runSeed() {
    console.log("🚀 Starting database seeding sequence...");
  
    try {
      console.log("🧹 Purging old data tables...");
      await db.delete(matchGames);
      await db.delete(matches);
      await db.delete(players);
      await db.delete(teams);
      await db.delete(divisions);
  
      // =========================================================================
      // 1. FIXED: PASS VALUES DIRECTLY AS A TYPE-SAFE ARRAY
      // =========================================================================
      console.log("🏆 Seeding league divisions...");
      const seededDivs = await db
        .insert(divisions)
        .values([
          { name: "Premier Division", tier: 1 },
          { name: "Championship Division", tier: 2 },
        ])
        .returning();
  
      const premDiv = seededDivs[0];
      const champDiv = seededDivs[1];
  
      // =========================================================================
      // 2. FIXED: EXPLICIT SQUAD MATRICES
      // =========================================================================
      console.log("🛡️ Seeding club squads...");
      const seededTeams = await db
        .insert(teams)
        .values([
          { name: "Crucible Club", divisionId: premDiv.id, points: 4 },
          { name: "The Rack Pack", divisionId: premDiv.id, points: 2 },
          { name: "Cue Masters", divisionId: champDiv.id, points: 2 },
          { name: "Pocket Rocketeers", divisionId: champDiv.id, points: 0 },
        ])
        .returning();
  
      const crucibleClub = seededTeams[0];
      const rackPack = seededTeams[1];
      const cueMasters = seededTeams[2];
      const pocketRocketeers = seededTeams[3];
  
      // =========================================================================
      // 3. FIXED: ROSTER ENTRIES
      // =========================================================================
      console.log("👥 Seeding active roster players...");
      const seededPlayers = await db
        .insert(players)
        .values([
          { name: "Ronnie O'Sullivan", teamId: crucibleClub.id },
          { name: "Judd Trump", teamId: crucibleClub.id },
          { name: "John Higgins", teamId: crucibleClub.id },
          { name: "Mark Selby", teamId: rackPack.id },
          { name: "Neil Robertson", teamId: rackPack.id },
          { name: "Mark Williams", teamId: rackPack.id },
          { name: "Shaun Murphy", teamId: cueMasters.id },
          { name: "Kyren Wilson", teamId: cueMasters.id },
          { name: "Ding Junhui", teamId: cueMasters.id },
          { name: "Luca Brecel", teamId: pocketRocketeers.id },
          { name: "Ali Carter", teamId: pocketRocketeers.id },
          { name: "Jack Lisowski", teamId: pocketRocketeers.id },
        ])
        .returning();
  
      const p = (name: string) => seededPlayers.find((pl) => pl.name === name)?.id || null;
  
      // =========================================================================
    // 4. FIXED: FIXTURES & SCORECARDS WITH TRUE DATE OBJECTS
    // =========================================================================
    console.log("📅 Seeding completed match score sheets...");
    const seededMatches = await db
      .insert(matches)
      .values([
        {
          homeTeamId: crucibleClub.id,
          awayTeamId: rackPack.id,
          homeTeamScoreTotal: 3,
          awayTeamScoreTotal: 1,
          status: "completed",
          matchDate: new Date("2026-05-10"), // ⚡ FIXED: Wrapped string in a real Date instance
        },
      ])
      .returning();

    const match1 = seededMatches[0];
  
      // =========================================================================
      // 5. FIXED: FRAME ANALYSIS LEDGER
      // =========================================================================
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
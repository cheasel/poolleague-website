import { db } from "@/src/db";
import { players, matchGames, matches, teams, divisions, seasons, teamMemberships } from "@/src/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PlayerProfileClient from "./player-profile-client";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const getCachedPlayerProfile = (playerId: number) => unstable_cache(
  async () => {
    const [row] = await db
      .select({
        id: players.id,
        name: players.name,
        imageUrl: players.imageUrl,
      })
      .from(players)
      .where(eq(players.id, playerId));
    return row || null;
  },
  ["player-profile", String(playerId)],
  { revalidate: 60, tags: ["players"] }
)();

const getCachedPlayerMemberships = (playerId: number) => unstable_cache(
  async () => {
    return db
      .select({
        seasonId: teamMemberships.seasonId,
        teamName: teams.name,
      })
      .from(teamMemberships)
      .leftJoin(teams, eq(teamMemberships.teamId, teams.id))
      .where(eq(teamMemberships.playerId, playerId));
  },
  ["player-memberships", String(playerId)],
  { revalidate: 60, tags: ["players", "teams"] }
)();

const getCachedSeasons = unstable_cache(
  async () => {
    return db.select().from(seasons).orderBy(desc(seasons.name));
  },
  ["seasons-list"],
  { revalidate: 300, tags: ["seasons"] }
);

const getCachedPlayerGames = (playerId: number) => unstable_cache(
  async () => {
    const homeTeams = alias(teams, "homeTeams");
    const awayTeams = alias(teams, "awayTeams");
    const p1 = alias(players, "p1");
    const p1p = alias(players, "p1p");
    const p2 = alias(players, "p2");
    const p2p = alias(players, "p2p");

    return db
      .select({
        id: matchGames.id,
        gameType: matchGames.gameType,
        player1Id: matchGames.player1Id,
        player1PartnerId: matchGames.player1PartnerId,
        player2Id: matchGames.player2Id,
        player2PartnerId: matchGames.player2PartnerId,
        player1Name: p1.name,
        player1PartnerName: p1p.name,
        player2Name: p2.name,
        player2PartnerName: p2p.name,
        player1Score: matchGames.player1Score,
        player2Score: matchGames.player2Score,
        matchId: matchGames.matchId,
        matchDate: matches.date,
        homeTeamName: homeTeams.name,
        awayTeamName: awayTeams.name,
        seasonId: divisions.seasonId,
        seasonName: seasons.name,
        divisionName: divisions.name,
      })
      .from(matchGames)
      .leftJoin(matches, eq(matchGames.matchId, matches.id))
      .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
      .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
      .leftJoin(divisions, eq(matches.divisionId, divisions.id))
      .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
      .leftJoin(p1, eq(matchGames.player1Id, p1.id))
      .leftJoin(p1p, eq(matchGames.player1PartnerId, p1p.id))
      .leftJoin(p2, eq(matchGames.player2Id, p2.id))
      .leftJoin(p2p, eq(matchGames.player2PartnerId, p2p.id))
      .where(
        or(
          eq(matchGames.player1Id, playerId),
          eq(matchGames.player1PartnerId, playerId),
          eq(matchGames.player2Id, playerId),
          eq(matchGames.player2PartnerId, playerId)
        )
      )
      .orderBy(desc(matches.date), desc(matchGames.gameOrder))
      .limit(200); // Cap results — OR conditions on 4 cols = full scan without limit
  },
  ["player-games-list", String(playerId)],
  { revalidate: 60, tags: ["matchGames", "matches", "teams", "players"] }
)();

export default async function PlayerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const playerId = Number(id);

  // Run all queries sequentially to avoid deadlock on cache misses
  const player = await getCachedPlayerProfile(playerId);
  const allSeasons = await getCachedSeasons();
  const rawGames = await getCachedPlayerGames(playerId);
  const memberships = await getCachedPlayerMemberships(playerId);

  if (!player) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Player profile sheet unavailable.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">

      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 py-8 relative z-10 space-y-6">
          <Link href="/players" prefetch={false} className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all">
            <ArrowLeft className="w-4 h-4" /> Return to Analytics Leaderboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">Competitor Profile</span>
              <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter italic">
                Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Insights</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <PlayerProfileClient
          playerId={playerId}
          playerName={player.name}
          imageUrl={player.imageUrl}
          teamName="Unassigned Agent"
          games={rawGames as any}
          seasons={allSeasons}
          memberships={memberships}
        />
      </div>
    </div>
  );
}
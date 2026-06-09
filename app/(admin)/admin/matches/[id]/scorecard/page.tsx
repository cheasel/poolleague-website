import { db } from "@/src/db";
import { matches, matchGames, players, teams, teamMemberships } from "@/src/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RackEntrySystem from "../rack-entry-system";
import { redirect } from "next/navigation";
import { assertWritePrivilege, getIsReadOnly } from "@/src/utils/auth-guards";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchScorecardPage({ params }: PageProps) {
  const { id } = await params;
  const matchId = Number(id);
  const isReadOnly = await getIsReadOnly();

  // Fetch parent match metadata
  const [match] = await db
    .select({
      id: matches.id,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamName: teams.name,
      homeTeamScoreTotal: matches.homeScore,
      awayTeamScoreTotal: matches.awayScore,
      seasonId: matches.seasonId,
    })
    .from(matches)
    .leftJoin(teams, eq(matches.homeTeamId, teams.id))
    .where(eq(matches.id, matchId));

  if (!match) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Match fixture not found.</div>;
  }

  // Fetch away team name safely
  const [awayTeam] = match.awayTeamId 
    ? await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.awayTeamId))
    : [null];
  const awayTeamName = awayTeam?.name || "Away Club";

  // Fetch players for selection drops using season memberships
  const homePlayers = match.homeTeamId && match.seasonId
    ? await db
        .select({
          id: players.id,
          name: players.name,
          teamId: teamMemberships.teamId,
          imageUrl: players.imageUrl,
        })
        .from(teamMemberships)
        .leftJoin(players, eq(teamMemberships.playerId, players.id))
        .where(
          and(
            eq(teamMemberships.teamId, match.homeTeamId),
            eq(teamMemberships.seasonId, match.seasonId)
          )
        )
        .orderBy(asc(players.name))
    : [];

  const awayPlayers = match.awayTeamId && match.seasonId
    ? await db
        .select({
          id: players.id,
          name: players.name,
          teamId: teamMemberships.teamId,
          imageUrl: players.imageUrl,
        })
        .from(teamMemberships)
        .leftJoin(players, eq(teamMemberships.playerId, players.id))
        .where(
          and(
            eq(teamMemberships.teamId, match.awayTeamId),
            eq(teamMemberships.seasonId, match.seasonId)
          )
        )
        .orderBy(asc(players.name))
    : [];

  // Fetch any existing frames to populate form on reload
  const existingFrames = await db
    .select()
    .from(matchGames)
    .where(eq(matchGames.matchId, matchId))
    .orderBy(asc(matchGames.gameOrder));

  // Single comprehensive Server Action handling the client state structure
  async function saveFullScorecardAction(formData: FormData) {
    "use server";
    await assertWritePrivilege();
    const jsonRaw = formData.get("racksJson") as string;
    if (!jsonRaw) return;

    const uploadedRacks = JSON.parse(jsonRaw);

    // Wrap ALL DB operations in a single transaction to prevent partial saves
    await db.transaction(async (tx) => {
      // 1. Wipe existing match frames inside the transaction
      await tx.delete(matchGames).where(eq(matchGames.matchId, matchId));

      let localHomeWins = 0;
      let localAwayWins = 0;

      // 2. Insert all updated frames atomically as a batch insert
      const insertValues = [];
      for (let i = 0; i < uploadedRacks.length; i++) {
        const rack = uploadedRacks[i];
        const isHomeWin = rack.winner === "home";

        if (isHomeWin) localHomeWins++;
        else if (rack.winner === "away") localAwayWins++;

        insertValues.push({
          matchId,
          gameOrder: i + 1,
          gameType: rack.type,
          player1Id: rack.homePlayer1Id ? Number(rack.homePlayer1Id) : null,
          player1PartnerId: rack.type === "double" && rack.homePlayer2Id ? Number(rack.homePlayer2Id) : null,
          player2Id: rack.awayPlayer1Id ? Number(rack.awayPlayer1Id) : null,
          player2PartnerId: rack.type === "double" && rack.awayPlayer2Id ? Number(rack.awayPlayer2Id) : null,
          player1Score: isHomeWin ? 1 : 0,
          player2Score: isHomeWin ? 0 : 1,
        });
      }

      if (insertValues.length > 0) {
        await tx.insert(matchGames).values(insertValues);
      }

      // 3. Update top-level match summary (status + score) atomically
      await tx
        .update(matches)
        .set({
          homeScore: localHomeWins,
          awayScore: localAwayWins,
          status: uploadedRacks.length > 0 ? "completed" : "scheduled",
        })
        .where(eq(matches.id, matchId));
    });

    // Invalidate all affected cache tags so every page reflects the new state
    revalidateTag("matches");
    revalidateTag("teams");
    revalidateTag("standings");
    revalidateTag("players");
    revalidateTag("matchGames");

    // Purge specific paths as well for ISR/static pages
    revalidatePath("/");
    revalidatePath("/standings");
    revalidatePath("/players");
    revalidatePath("/matches");
    revalidatePath("/teams");
    revalidatePath(`/admin/matches/${matchId}`);
    revalidatePath(`/admin/matches/${matchId}/scorecard`);

    redirect(`/admin/matches/${matchId}`);
  }

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto px-4 pt-4 text-slate-200">
      <header className="flex items-center justify-between">
        <Link href={`/admin/matches/${matchId}`} className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all">
          <ArrowLeft className="w-4 h-4" /> Return to Match Details
        </Link>
        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-500 font-black px-4 py-1.5 rounded-xl uppercase tracking-[0.2em] shadow-inner">
          Scorecard Matrix #{matchId}
        </span>
      </header>

      <section className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 text-white shadow-2xl border border-slate-900 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-indigo-500/5 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="text-center md:text-right">
            <span className="text-[8px] font-black tracking-[0.3em] text-slate-600 block uppercase mb-1.5">Home Arena</span>
            <span className="text-lg md:text-xl font-black uppercase text-white tracking-tight">{match.homeTeamName || "Home Club"}</span>
          </div>
          <div className="bg-slate-950 px-6 py-3 border border-slate-800 rounded-2xl w-max mx-auto shadow-2xl">
            <span className="text-2xl font-mono tracking-[0.2em] font-black text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.3)]">
              {match.homeTeamScoreTotal ?? 0} <span className="text-slate-800 text-xl font-normal mx-0.5">:</span> {match.awayTeamScoreTotal ?? 0}
            </span>
          </div>
          <div className="text-center md:text-left">
            <span className="text-[8px] font-black tracking-[0.3em] text-slate-600 block uppercase mb-1.5">Away Squad</span>
            <span className="text-lg md:text-xl font-black uppercase text-white tracking-tight">{awayTeamName}</span>
          </div>
        </div>
      </section>

      {/* Render the core interactive UI client component layer */}
      <RackEntrySystem 
        homePlayers={homePlayers.filter(p => p.id !== null && p.name !== null).map(p => ({
          id: p.id!,
          name: p.name!,
          teamId: p.teamId,
          imageUrl: p.imageUrl,
        }))} 
        awayPlayers={awayPlayers.filter(p => p.id !== null && p.name !== null).map(p => ({
          id: p.id!,
          name: p.name!,
          teamId: p.teamId,
          imageUrl: p.imageUrl,
        }))} 
        initialGames={existingFrames} 
        initialHomeScore={match.homeTeamScoreTotal ?? 0}
        initialAwayScore={match.awayTeamScoreTotal ?? 0}
        onSave={saveFullScorecardAction} 
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
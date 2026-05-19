import { db } from "@/src/db";
import { matches, teams, matchGames, players } from "@/src/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CheckCircle2, AlertCircle, Plus, ArrowUpDown } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    selectedMatch?: string;
    sort?: "asc" | "desc";
  }>;
}

export default async function AdminMatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeMatchId = params.selectedMatch ? Number(params.selectedMatch) : null;
  
  // 1. Fallback to descending (newest matches first) if no sort parameter is passed
  const sortOrder = params.sort === "asc" ? asc(matches.matchDate) : desc(matches.matchDate);

  // Fetch all matches utilizing the active sort selection parameter
  const allMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      homeTeamScoreTotal: matches.homeTeamScoreTotal,
      awayTeamId: matches.awayTeamId,
      awayTeamScoreTotal: matches.awayTeamScoreTotal,
    })
    .from(matches)
    .orderBy(sortOrder);

  // Helper utility to cleanly look up team names
  const rawTeams = await db.select().from(teams);
  const getTeamName = (id: number | null) => rawTeams.find(t => t.id === id)?.name || "Unknown Squad";

  // 2. Fetch tracking details if a match card is actively selected
  const activeMatch = allMatches.find((m) => m.id === activeMatchId);
  
  let availableHomePlayers: any[] = [];
  let availableAwayPlayers: any[] = [];
  let currentMatchGames: any[] = [];

  if (activeMatch && activeMatch.homeTeamId && activeMatch.awayTeamId) {
    availableHomePlayers = await db.select().from(players).where(eq(players.teamId, activeMatch.homeTeamId));
    availableAwayPlayers = await db.select().from(players).where(eq(players.teamId, activeMatch.awayTeamId));
    currentMatchGames = await db.select().from(matchGames).where(eq(matchGames.matchId, activeMatch.id)).orderBy(asc(matchGames.gameOrder));
  }

  // Helper utility to get player name by ID
  const allPlayersRaw = await db.select().from(players);
  const getPlayerDisplay = (id1: number | null, id2: number | null) => {
    const p1 = allPlayersRaw.find(p => p.id === id1)?.name;
    const p2 = allPlayersRaw.find(p => p.id === id2)?.name;
    if (p1 && p2) return `${p1} & ${p2}`;
    return p1 || "Vacant Slot";
  };

  // =========================================================================
  // SERVER ACTION: APPEND A FRAME TO THE MATCH RECORD
  // =========================================================================
  async function addFrameAction(formData: FormData) {
    "use server";
    const matchId = Number(formData.get("matchId"));
    const gameType = formData.get("gameType") as "single" | "double";
    
    const p1Id = formData.get("player1Id") ? Number(formData.get("player1Id")) : null;
    const p1PartnerId = formData.get("player1PartnerId") ? Number(formData.get("player1PartnerId")) : null;
    const p2Id = formData.get("player2Id") ? Number(formData.get("player2Id")) : null;
    const p2PartnerId = formData.get("player2PartnerId") ? Number(formData.get("player2PartnerId")) : null;

    const p1Score = Number(formData.get("player1Score") || 0);
    const p2Score = Number(formData.get("player2Score") || 0);

    if (!matchId) return;

    const existing = await db.select().from(matchGames).where(eq(matchGames.matchId, matchId));
    const nextOrder = existing.length + 1;

    await db.insert(matchGames).values({
      matchId,
      gameOrder: nextOrder,
      gameType,
      player1Id: p1Id,
      player1PartnerId: gameType === "double" ? p1PartnerId : null, // Only store partner if format is doubles
      player2Id: p2Id,
      player2PartnerId: gameType === "double" ? p2PartnerId : null,
      player1Score: p1Score,
      player2Score: p2Score,
    });

    let homeIncrement = p1Score > p2Score ? 1 : 0;
    let awayIncrement = p2Score > p1Score ? 1 : 0;

    const currentMatchRecord = await db.select().from(matches).where(eq(matches.id, matchId));
    if (currentMatchRecord[0]) {
      await db
        .update(matches)
        .set({
          homeTeamScoreTotal: (currentMatchRecord[0].homeTeamScoreTotal || 0) + homeIncrement,
          awayTeamScoreTotal: (currentMatchRecord[0].awayTeamScoreTotal || 0) + awayIncrement,
        })
        .where(eq(matches.id, matchId));
    }

    revalidatePath("/admin/matches");
  }

  // =========================================================================
  // SERVER ACTION: FINALIZE & LOCK THE COMPLETED MATCH
  // =========================================================================
  async function finalizeMatchAction(formData: FormData) {
    "use server";
    const matchId = Number(formData.get("matchId"));
    if (!matchId) return;

    const currentMatch = await db.select().from(matches).where(eq(matches.id, matchId));
    if (!currentMatch[0] || !currentMatch[0].homeTeamId || !currentMatch[0].awayTeamId) return;

    const homeScore = currentMatch[0].homeTeamScoreTotal || 0;
    const awayScore = currentMatch[0].awayTeamScoreTotal || 0;

    let homePointsAward = 0;
    let awayPointsAward = 0;

    if (homeScore > awayScore) homePointsAward = 3;
    else if (awayScore > homeScore) awayPointsAward = 3;
    else {
      homePointsAward = 1;
      awayPointsAward = 1;
    }

    await db.update(matches).set({ status: "completed" }).where(eq(matches.id, matchId));

    const homeTeam = await db.select().from(teams).where(eq(teams.id, currentMatch[0].homeTeamId));
    if (homeTeam[0]) {
      await db.update(teams).set({ points: (homeTeam[0].points || 0) + homePointsAward }).where(eq(teams.id, homeTeam[0].id));
    }

    const awayTeam = await db.select().from(teams).where(eq(teams.id, currentMatch[0].awayTeamId));
    if (awayTeam[0]) {
      await db.update(teams).set({ points: (awayTeam[0].points || 0) + awayPointsAward }).where(eq(teams.id, awayTeam[0].id));
    }

    revalidatePath("/admin/matches");
  }

  // Toggle calculation for the interactive sorting links
  const nextSortParam = params.sort === "asc" ? "desc" : "asc";

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      
      <header className="border-b border-slate-200/60 pb-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">Live Match Logistics</span>
        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">
          Scorecard <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Dispatch</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-0.5">Input raw frame results, track match validation steps, and update team standings instantly.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: TIMELINE LEDGER CORES */}
        <div className="lg:col-span-5 space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Scheduled Fixtures Ledger</span>
            
            {/* ✅ ADDED: INTERACTIVE DATE SORTING TRIGGER BAR */}
            <a 
              href={`/admin/matches?sort=${nextSortParam}${activeMatchId ? `&selectedMatch=${activeMatchId}` : ""}`}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" /> Date: {params.sort === "asc" ? "Oldest" : "Newest"}
            </a>
          </div>
          
          {allMatches.map((m) => {
            const isSelected = m.id === activeMatchId;
            const isCompleted = m.status === "completed";
            const homeName = getTeamName(m.homeTeamId);
            const awayName = getTeamName(m.awayTeamId);

            return (
              <a
                key={m.id}
                href={`/admin/matches?selectedMatch=${m.id}&sort=${params.sort || "desc"}`}
                className={`block p-4 rounded-2xl border transition-all ${
                  isSelected 
                    ? "bg-slate-950 border-slate-950 text-white shadow-md shadow-slate-950/10" 
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    isCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"
                  }`}>
                    {m.status}
                  </span>
                  <span className="text-[10px] font-bold tabular-nums text-slate-400">
                    {m.matchDate ? new Date(m.matchDate).toLocaleDateString() : "TBD"}
                  </span>
                </div>

                <div className="flex justify-between items-center font-black text-xs uppercase tracking-tight">
                  <span className="truncate w-1/3 text-left">{homeName}</span>
                  <span className="text-sm tracking-normal font-mono px-2 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white rounded">
                    {m.homeTeamScoreTotal ?? 0} : {m.awayTeamScoreTotal ?? 0}
                  </span>
                  <span className="truncate w-1/3 text-right">{awayName}</span>
                </div>
              </a>
            );
          })}
        </div>

        {/* RIGHT COLUMN: LIVE SCORECARD MATRICES SHEET */}
        <div className="lg:col-span-7">
          {activeMatch ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">
                    {getTeamName(activeMatch.homeTeamId)} <span className="text-slate-300 font-medium font-mono px-1">vs</span> {getTeamName(activeMatch.awayTeamId)}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Live Scorecard Verification Blueprint</p>
                </div>
                
                {activeMatch.status !== "completed" && (
                  <form action={finalizeMatchAction}>
                    <input type="hidden" name="matchId" value={activeMatch.id} />
                    <button type="submit" className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest py-2 px-4 rounded-xl transition-all shadow-md shadow-emerald-100">
                      Lock Final Scores
                    </button>
                  </form>
                )}
              </div>

              {/* Played Frames Rendered History */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block px-1">Played Frame History</span>
                {currentMatchGames.map((game) => (
                  <div key={game.id} className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="text-[10px] font-black text-slate-400 font-mono">F{game.gameOrder} <span className="text-[8px] uppercase tracking-tighter text-indigo-500">({game.gameType})</span></span>
                    <div className="flex-1 px-4 grid grid-cols-3 items-center text-center">
                      <span className="text-left truncate text-slate-900 font-black">{getPlayerDisplay(game.player1Id, game.player1PartnerId)}</span>
                      <span className="font-mono bg-white border border-slate-200 rounded px-2 py-0.5 mx-auto font-black text-slate-950">
                        {game.player1Score} — {game.player2Score}
                      </span>
                      <span className="text-right truncate text-slate-900 font-black">{getPlayerDisplay(game.player2Id, game.player2PartnerId)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Form Component Sheet */}
              {activeMatch.status !== "completed" ? (
                <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Append Scoreboard Frame</h3>
                  </div>

                  {/* ✅ UPGRADED: Standard HTML Form elements utilizing CSS peer-checked properties to dynamically expand doubles forms without forcing use-client tracking loops */}
                  <form action={addFrameAction} className="space-y-4 group">
                    <input type="hidden" name="matchId" value={activeMatch.id} />
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Frame Match Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase cursor-pointer has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50/30">
                          <input type="radio" name="gameType" value="single" defaultChecked className="peer accent-indigo-600" />
                          Singles Frame
                        </label>
                        {/* 2. Add an explicit HTML ID to the radio input check vector */}
                        <label className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase cursor-pointer has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50/30">
                          <input type="radio" name="gameType" value="double" id="doublesTrigger" className="peer accent-indigo-600" />
                          Doubles Frame
                        </label>
                      </div>
                    </div>

                    {/* Master Flex Core Rows container */}
                    <div className="space-y-3">
                      {/* Primary Core Competitor Input Rows */}
                      <div className="grid grid-cols-7 gap-2 items-center text-center">
                        <div className="col-span-3">
                          <select name="player1Id" required className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none truncate">
                            <option value="">Select Home Competitor...</option>
                            {availableHomePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="col-span-1">
                          <input type="number" name="player1Score" placeholder="0" min="0" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-center font-mono text-sm text-slate-950 outline-none" />
                        </div>
                        <div className="col-span-1 font-black text-slate-300 font-mono text-xs">VS</div>
                        <div className="col-span-1">
                          <input type="number" name="player2Score" placeholder="0" min="0" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-center font-mono text-sm text-slate-950 outline-none" />
                        </div>
                        <div className="col-span-3">
                          <select name="player2Id" required className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none truncate">
                            <option value="">Select Away Competitor...</option>
                            {availableAwayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* ✅ FIXED: Clean Tailwind v4 native group-has variant check */}
                      <div className="grid grid-cols-7 gap-2 items-center text-center transition-all duration-300 opacity-0 max-h-0 overflow-hidden group-has-[#doublesTrigger:checked]:opacity-100 group-has-[#doublesTrigger:checked]:max-h-24">
                        <div className="col-span-3">
                          <select name="player1PartnerId" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none truncate">
                            <option value="">Select Home Partner...</option>
                            {availableHomePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="col-span-1"></div>
                        <div className="col-span-1 font-black text-slate-300 font-mono text-xs">&</div>
                        <div className="col-span-1"></div>
                        <div className="col-span-3">
                          <select name="player2PartnerId" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none truncate">
                            <option value="">Select Away Partner...</option>
                            {availableAwayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl transition-all shadow-md shadow-indigo-100">
                      Submit Frame Result
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-bold uppercase tracking-tight">
                  This match has been locked and authorized. Final league standings points have been distributed.
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest flex flex-col items-center justify-center min-h-[40vh] border-dashed">
              <AlertCircle className="w-6 h-6 text-slate-300 mb-2 stroke-[1.5]" />
              Select a scheduled fixture from the timeline ledger panel to open its interactive verification scorecard.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}